import type { Runtime } from '@bedrock-core/server-runtime';
import { system, world, type Player } from '@minecraft/server';
import {
  back, clearPlayerNavigation, closeUi, handOff, navigateAsync, openScreen, setNavigator,
  type NavigateOptions, type Navigated,
} from '../runtime/navigate';
import {
  isNavigationSnapshot, navigationRevision, navigationSnapshot, restoreNavigation,
  type NavigationSnapshot, type ScreenLocation,
} from '../runtime/history';
import { presentReference } from '../runtime/reference';
import { screenParametersError as screenParameterError, type ScreenMetadata as ScreenDescriptor } from '@bedrock-core/ui-runtime';
import { ScreensRegistry } from './screens';

const METHOD = 'core:navigation.open';

/** A host opens its screen from validated public parameters and rebuilds private models locally. */
export type ScreenOpener = (player: Player, options: ScreenOpenOptions) => boolean | void | Promise<boolean | void>;

/** Validated inputs and logical destination supplied to a registered host opener. */
export interface ScreenOpenOptions extends NavigateOptions {
  readonly location: ScreenLocation;
}

/** Optional Core integration. Player history belongs to the navigation library. */
export interface ServerNavigation {
  readonly screens: ScreensRegistry;
  /** Registers an entry point and optionally the host that opens it. Returns its disposer. */
  register(screen: ScreenDescriptor, open?: ScreenOpener): () => void;
}

declare module '@bedrock-core/server-runtime' {
  interface RuntimeSlots {
    'core:navigation': ServerNavigation;
  }
}

interface OpenRequest {
  readonly playerId: string;
  readonly snapshot: NavigationSnapshot;
}

function isRequest(value: unknown): value is OpenRequest {
  return typeof value === 'object' && value !== null && 'playerId' in value && typeof value.playerId === 'string'
    && 'snapshot' in value && isNavigationSnapshot(value.snapshot) && value.snapshot.current !== undefined;
}

class RealmNavigation implements ServerNavigation {
  readonly screens: ScreensRegistry;
  private readonly _core: Runtime;
  private readonly _openers = new Map<string, ScreenOpener>();
  private readonly _registered = new Set<string>();

  constructor(core: Runtime) {
    this._core = core;
    this.screens = new ScreensRegistry(core);
  }

  start(): void {
    setNavigator({ show: (key, player, options) => this.route(key, player, options) });
    this._core.rpc.onRequest(METHOD, (request: unknown) => this.receive(request));
    world.afterEvents.playerLeave.subscribe(({ playerId }) => { clearPlayerNavigation(playerId); });
    system.run(() => {
      if (this._core.registered) { this.screens.publish(); }
    });
  }

  register(screen: ScreenDescriptor, open?: ScreenOpener): () => void {
    if (this._registered.has(screen.key)) { throw new Error(`Navigation already serves "${screen.key}".`); }

    this.screens.add(screen);
    this._registered.add(screen.key);

    if (open !== undefined) { this._openers.set(screen.key, open); }

    let active = true;

    return (): void => {
      if (!active) { return; }

      active = false;
      this._registered.delete(screen.key);
      this._openers.delete(screen.key);
      this.screens.remove(screen.key);
    };
  }

  private route(key: string, player: Player, options: NavigateOptions): Navigated | Promise<Navigated> {
    const screen = this.screens.get(key);

    if (screen === undefined) {
      console.warn(`[navigation] unknown or ambiguous screen "${key}".`);

      return false;
    }

    const error = screenParameterError(screen.parameters, options.params);

    if (error !== undefined) {
      console.warn(`[navigation] cannot open "${key}": ${error}`);

      return false;
    }

    if (screen.owner === this._core.id && this._openers.has(screen.key)) { return this.openLocal(screen.key, player, options); }

    const reference = this.screens.reference(screen.key);

    if (reference !== undefined) {
      void presentReference(candidate => this.screens.reference(candidate), screen.key, player).then((ended) => {
        if (ended === 'back') { back(player); } else if (ended === 'done') { closeUi(player); }
      });

      return true;
    }

    if (screen.owner === this._core.id) { return this.openLocal(screen.key, player, options); }

    if (this._core.registry.get(screen.owner) === undefined) { return false; }

    const snapshot = navigationSnapshot(player);
    const request: OpenRequest = { playerId: player.id, snapshot: {
      history: snapshot.history,
      current: { key: screen.key, ...options.params === undefined ? {} : { params: options.params }, ...options.checkpoint },
    } };
    const revision = navigationRevision(player);

    return this._core.rpc.request(screen.owner, METHOD, request).then((accepted): Navigated => {
      if (accepted !== true || navigationRevision(player) !== revision) { return false; }

      handOff(player);

      return 'handed-off';
    }).catch((error: unknown): false => {
      console.warn(`[navigation] "${screen.owner}" did not open "${screen.key}": ${String(error)}`);

      return false;
    });
  }

  private openLocal(key: string, player: Player, options: NavigateOptions): Navigated | Promise<Navigated> {
    const open = this._openers.get(key);

    if (open === undefined) { return openScreen(key, player, options); }

    const result = open(player, { ...options, location: {
      key, ...options.params === undefined ? {} : { params: options.params }, ...options.checkpoint,
    } });

    return result instanceof Promise ? result.then(accepted => accepted !== false) : result !== false;
  }

  private async receive(request: unknown): Promise<boolean> {
    if (!isRequest(request)) { return false; }

    const location = request.snapshot.current;

    if (location === undefined) { return false; }

    const screen = this.screens.get(location.key);
    const player = world.getPlayers().find(candidate => candidate.id === request.playerId);

    if (screen?.owner !== this._core.id || player === undefined
      || screenParameterError(screen.parameters, location.params) !== undefined) { return false; }

    const before = navigationSnapshot(player);

    restoreNavigation(player, request.snapshot);

    const { key, params, ...checkpoint } = location;
    const received = JSON.stringify(request.snapshot);

    const rollback = (): void => {
      if (JSON.stringify(navigationSnapshot(player)) === received) { restoreNavigation(player, before); }
    };

    try {
      const accepted = await navigateAsync(key, player, { ...params === undefined ? {} : { params }, checkpoint, replace: true });

      if (accepted === false) {
        rollback();

        return false;
      }

      return true;
    } catch (error: unknown) {
      rollback();

      console.warn(`[navigation] cannot open "${key}": ${String(error)}`);

      return false;
    }
  }
}

/** Installs Core screen discovery and cross-realm transport once in this script realm. */
export function navigation(core: Runtime): ServerNavigation {
  const existing = core.slot('core:navigation');

  if (existing !== undefined) { return existing; }

  const service = new RealmNavigation(core);

  core.fill('core:navigation', service);
  service.start();

  return service;
}
