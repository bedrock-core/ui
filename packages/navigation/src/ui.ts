/**
 * The UI a realm has, once, whichever apps are installed.
 *
 * ## A screen is drawn by the addon whose pack holds it
 *
 * Each addon's build compiles its own screens into its own pack. Most of the shared UI is in
 * every pack — the same layouts everywhere — so whichever realm a command is typed into draws
 * them itself. What is NOT in every pack is what one addon declared: a screen shaped for its
 * schema exists in exactly one bundle, and the script that answers a press on it runs in exactly
 * one realm. Reaching either means asking that addon's realm, and leaving it again means going
 * back to the realm that asked — the way back the request carries.
 *
 * So anything ABOUT another addon travels rather than being drawn here, as a {@link UiTarget}: a
 * realm running an older copy understands as much of one as it knows and falls back for the rest.
 *
 * ## What lives here rather than in an app
 *
 * An addon may install any mix of apps, and these are the parts that must exist exactly once per
 * realm however that mix comes out: the transport a foreign screen key is fetched over, the
 * navigator that resolves such a key, the way back, and where the realm thinks each player is.
 * An app registers what it draws ({@link UiPresence.serve}) and reads the rest back.
 *
 * ```ts
 * const ui = uiOf(core);
 *
 * ui.serve('config', (player, target) => openConfig(core, player, target));
 * ui.onReady(() => { pages(core).provide(pageReference()); });
 * ```
 */
import { system, world } from '@minecraft/server';
import type { Player } from '@minecraft/server';
import {
  addonReference,
  handOff,
  isScreenReference,
  navigate,
  pathThrough,
  returnPathOf,
  screenForKey,
  screenOwner,
  setReturnPath,
  shownKey,
  whyNotPlainData,
  type NavigateOptions,
  type ScreenReference,
} from '@bedrock-core/ui-runtime';
import { Announcement, type Runtime } from '@bedrock-core/server-runtime';
import { declaredParts } from './declared';
import { addonPageReference, pages } from './pages';
import { provideReferences } from './references';
import { screens } from './screens';
import { isScreenTarget, isUiReturn, isUiTarget, type ScreenTarget, type UiReturn, type UiTarget } from './target';

declare module '@bedrock-core/server-runtime' {
  interface RuntimeSlots {
    'core:ui': UiPresence;
  }
}

/** What draws one kind of target in this realm. */
export type TargetOpener = (player: Player, target: UiTarget) => void | Promise<void>;

/** A source of screen references beside the ones addons publish. */
export type ReferenceSource = (key: string) => ScreenReference | undefined;

/**
 * One realm asking another to show a player a place in the UI.
 *
 * The target is plain data and the receiving realm interprets it, so what is asked for and what
 * is drawn stay separable: an addon whose build shaped a screen draws that screen, and neither
 * side has to hold the other's layouts.
 */
interface ShowRequest {
  playerId: string;
  target: UiTarget;
  /**
   * The realms the player crossed to get here, oldest first. A `back()` that runs out of screens
   * in the receiving realm takes the last one and hands the rest on, so a chain of any depth
   * walks home through exactly the realms it came through.
   */
  returnTo?: UiReturn[];
}

/**
 * The method a realm is asked on for one kind of target: `core:catalog.show`, `core:config.show`,
 * `core:guide.show`, and `core:ui.show` for a compiled screen, which is the realm's own rather
 * than any app's.
 *
 * Derived from the kind rather than registered, so a caller maps one to the other with nothing to
 * probe. An addon that did not install the app does not serve the method, and the request is
 * refused with `unknown method` — a visible failure the caller falls back from, instead of a
 * target kind silently opening the wrong screen.
 */
export const methodFor = (kind: string): string => (kind === 'screen' ? 'core:ui.show' : `core:${kind}.show`);

/** The realm's one UI presence. Reached with {@link uiOf}. */
export interface UiPresence {
  /**
   * Register what draws one kind of target here. One opener per kind; registering a kind twice
   * throws rather than leaving two screens racing for the same request.
   */
  serve(kind: string, open: TargetOpener): void;

  /** Whether an app mounted in THIS realm draws that kind of target. */
  serves(kind: string): boolean;

  /**
   * Add a source of screen references tried before the addons' published ones. For screens baked
   * into a pack that no addon announces, such as the framework's own.
   */
  resolve(source: ReferenceSource): void;

  /**
   * Say which UI namespace a row belongs to when that row is not an addon that publishes.
   *
   * The framework is the one of these: it has a row and a guide but no realm, so it announces
   * nothing and {@link screenKey} would find no namespace for it.
   */
  alias(addonId: string, ns: string): void;

  /**
   * The key of one of `addonId`'s compiled screens by the name its build gave it.
   *
   * The addon half of a key is the namespace its SCREENS were compiled under, which an addon may
   * set apart from the namespace it syncs under — so it is read off what that addon published,
   * or off an {@link alias} for a row that publishes nothing. `undefined` when neither answers.
   */
  screenKey(addonId: string, name: string): string | undefined;

  /**
   * Run `publish` on the first tick, when every module the entry imports has been evaluated and
   * the build's declarations are in hand. Runs immediately if that tick has already passed.
   */
  onReady(publish: () => void): void;

  /**
   * Show a target: here, or in the realm of the addon that owns it. Resolves once the screen is
   * handed to the renderer.
   */
  show(player: Player, target: UiTarget): Promise<void>;

  /**
   * Ask another addon's realm to show a target, saying where the player goes when they leave it.
   *
   * Never rejects, and resolves whether that realm took the player: the owner being absent,
   * wedged or too old to understand the target all read the same from here — nothing was drawn —
   * and there is no second realm to try, so what a caller can still do is put the player
   * somewhere itself.
   */
  ask(owner: string, player: Player, target: UiTarget, from?: readonly UiReturn[]): Promise<boolean>;

  /**
   * The way back a request from here carries: the realms this player already crossed, with this
   * one appended when it has a place to name.
   */
  returnTo(player: Player): readonly UiReturn[];

  /**
   * Record what this realm is showing a player, as the target that put them there.
   *
   * A screen drawn from a MODEL — an addon list, a menu level, a roster — cannot be returned to
   * by its key: rendering its component with no model draws the empty shape of it. The target
   * that opened it is the thing that can be sent back across a realm, so every such screen goes
   * through here.
   */
  showing(player: Player, target: UiTarget): void;

  /**
   * The reference for one screen key: the sources this realm added first, then whatever an
   * addon published. `undefined` is a key nothing in this world can draw.
   */
  reference(key: string): ScreenReference | undefined;

  /**
   * Declare that this addon serves an app, by the name its target kind is known by.
   *
   * Announced as one list on the first tick, after every app has installed, so any realm can
   * tell what a peer answers before asking it. A browser uses it to draw an entry it cannot
   * reach as unreachable rather than leading a player at a request that will be refused.
   */
  offers(app: string): void;

  /** What `addonId` announced it serves. Empty for an addon that announced nothing. */
  offered(addonId: string): readonly string[];
}

/** What an addon announces it serves, under `core-ui/apps`. */
interface AddonApps {
  v: 1;
  apps: string[];
}

function isAddonApps(value: unknown): value is AddonApps {
  if (typeof value !== 'object' || value === null) { return false; }

  const { apps } = value as { apps?: unknown };

  return Array.isArray(apps) && apps.every(app => typeof app === 'string');
}

class UiRealm implements UiPresence {
  private readonly _core: Runtime;
  private readonly _openers = new Map<string, TargetOpener>();
  private readonly _sources: ReferenceSource[] = [];
  private readonly _ready: (() => void)[] = [];
  private readonly _showing = new Map<string, UiTarget>();
  private readonly _aliases = new Map<string, string>();
  private readonly _offers = new Set<string>();
  private readonly _apps: Announcement<AddonApps>;
  private _readyFired = false;

  constructor(core: Runtime) {
    this._core = core;
    this._apps = new Announcement<AddonApps>(core.node.state, core.id, 'ui/apps', isAddonApps);
  }

  start(): void {
    // The realm's own method: a compiled screen by key, which belongs to no app.
    this.answer(methodFor('screen'));

    // How a key this bundle did not compile resolves from here on: the sources an app added,
    // then whatever any addon published, then the owning realm itself for a screen no reference
    // can describe.
    provideReferences(key => this.reference(key), {
      ask: (owner, key, player, params): boolean => {
        // Only a realm that is online can draw anything, and asking ourselves for a key we have
        // already failed to resolve is a loop. Either way the caller says "no such screen"
        // immediately rather than spending an RPC timeout on the same answer.
        if (owner === this._core.id || this._core.registry.get(owner) === undefined) { return false; }

        void this.ask(owner, player, screenTarget(key, params), this.returnTo(player));

        return true;
      },
      sendBack: (address, rest, player): boolean => {
        // The target was sent by whichever realm asked — read back through the same narrowing as
        // anything else off the wire, since that realm may be older.
        if (!isUiTarget(address.target)) { return false; }

        // What is left of the way back travels with the request, so the realm the player lands in
        // can carry them further home without this one remembering anything.
        void this.ask(address.realm, player, address.target, rest.filter(isUiReturn));

        return true;
      },
    });

    // One compiled screen by its key and params, shown in PLACE of whatever the player is on:
    // arriving here is either a press in this realm, which already put the screen it left behind
    // them, or another realm handing the player over, which sent the way back as the return address.
    this.serve('screen', (player, target) => {
      if (!isScreenTarget(target)) { return; }

      this.showing(player, target);
      navigate(target.key, player, { replace: true, ...target.params === undefined ? {} : { params: target.params } });
    });

    // A player who left takes their place with them; nothing else prunes this map.
    world.afterEvents.playerLeave.subscribe(({ playerId }) => { this._showing.delete(playerId); });

    // Every static screen this addon compiled, so any realm can show them: a guide's pages, a
    // menu, anything whose presses are links. Empty for an addon that compiled none, which
    // publishes an empty table rather than nothing.
    this.onReady(() => { screens(this._core).provide(addonReference(this._core.id)); });

    // The page follows from the manifest, so every addon's build compiles one and every realm
    // announces it — including an addon that installed no catalog of its own, whose page is
    // still what another addon's catalog draws for its row.
    this.onReady(() => {
      const { page } = declaredParts();

      if (page !== undefined) { pages(this._core).provide(addonPageReference(page)); }
    });

    system.run(() => {
      this._readyFired = true;

      for (const publish of this._ready.splice(0)) { run(publish); }

      // Last, so a publisher that decided during its own tick whether it has anything to serve
      // is counted: what this addon answers is one list, announced once.
      run(() => { this._apps.provide({ v: 1, apps: [...this._offers] }); });
    });
  }

  serve(kind: string, open: TargetOpener): void {
    if (this._openers.has(kind)) { throw new Error(`ui target kind '${kind}' is already served in this realm`); }

    this._openers.set(kind, open);
    this.answer(methodFor(kind));
  }

  /**
   * Serve one of this realm's show methods.
   *
   * Every kind gets its own, so a realm that installed no catalog simply does not answer
   * `core:catalog.show` and the caller hears `unknown method` rather than landing somewhere else.
   */
  private answer(method: string): void {
    this._core.rpc.serve<Record<string, (params: ShowRequest) => boolean>>({
      [method]: ({ playerId, target, returnTo }: ShowRequest): boolean => {
        const player = world.getPlayers().find(candidate => candidate.id === playerId);

        // Disconnected between the request being sent and it arriving. Nothing the caller can do
        // about it, so reject rather than drop it silently.
        if (!player) { throw new Error(`${method}: player '${playerId}' is not in the world`); }

        // Recorded before the screen is shown, so a back press out of the bottom of THIS realm's
        // stack lands back where the player came from. A request carrying no way back clears
        // whatever the last one left, which is what a player arriving fresh should find.
        const path = returnTo ?? [];

        setReturnPath(player.id, path.every(isUiReturn) ? path : []);

        void this.show(player, target);

        return true;
      },
    });
  }

  serves(kind: string): boolean {
    return this._openers.has(kind);
  }

  resolve(source: ReferenceSource): void {
    this._sources.push(source);
  }

  alias(addonId: string, ns: string): void {
    this._aliases.set(addonId, ns);
  }

  screenKey(addonId: string, name: string): string | undefined {
    const ns = screens(this._core).of(addonId)?.ns ?? this._aliases.get(addonId);

    return ns === undefined ? undefined : `${ns}:${name}`;
  }

  onReady(publish: () => void): void {
    if (this._readyFired) {
      run(publish);

      return;
    }

    this._ready.push(publish);
  }

  async show(player: Player, target: UiTarget): Promise<void> {
    // A screen this bundle did not compile is handed to the addon that did: its component exists
    // in exactly one bundle, so there is nothing here to draw.
    if (isScreenTarget(target) && screenForKey(target.key) === undefined) {
      const owner = screenOwner(target.key);

      if (owner !== undefined && owner !== this._core.id) {
        await this.ask(owner, player, target, this.returnTo(player));

        return;
      }
    }

    const open = this._openers.get(target.kind);

    if (open !== undefined) {
      await open(player, target);

      return;
    }

    // Nothing here draws this kind. The addon the target is about may — it installed the app this
    // realm did not — so the request goes there rather than dying in a log line.
    const owner = typeof target.addonId === 'string' ? target.addonId : undefined;

    if (owner !== undefined && owner !== this._core.id && this._core.registry.get(owner) !== undefined) {
      await this.ask(owner, player, target, this.returnTo(player));

      return;
    }

    console.error(`[ui] nothing in this world serves '${target.kind}' targets`);
  }

  ask(owner: string, player: Player, target: UiTarget, from: readonly UiReturn[] = []): Promise<boolean> {
    return this._core.rpc.request(owner, methodFor(target.kind), {
      playerId: player.id,
      target,
      ...from.length === 0 ? {} : { returnTo: [...from] },
    })
      // An older realm that answers with nothing served the request the only way it knew; only an
      // explicit no means the player is still standing where they were.
      .then((shown) => {
        // The other realm is drawing now, so this one stops: its component tree, its input lock
        // and its stack go, and the forms on screen stay — closing them would close the one that
        // realm just opened.
        if (shown !== false) {
          this._showing.delete(player.id);
          handOff(player);
        }

        return shown !== false;
      })
      .catch((error: unknown) => {
        console.warn(`[ui] '${owner}' did not show a '${target.kind}' target: ${String(error)}`);

        return false;
      });
  }

  returnTo(player: Player): readonly UiReturn[] {
    const here = this.hereFor(player);

    return here === undefined
      ? returnPathOf(player.id).filter(isUiReturn)
      : pathThrough(player.id, here).filter(isUiReturn);
  }

  showing(player: Player, target: UiTarget): void {
    this._showing.set(player.id, target);
  }

  offers(app: string): void {
    this._offers.add(app);
  }

  offered(addonId: string): readonly string[] {
    return this._apps.of(addonId)?.apps ?? [];
  }

  /** Where this realm has the player right now, as something it can be asked for again. */
  private hereFor(player: Player): UiReturn | undefined {
    const place = this._showing.get(player.id);

    if (place !== undefined) {
      return { realm: this._core.id, target: place };
    }

    // A screen this realm reached by key alone: no model, so the key IS the place.
    const key = shownKey(player.id);

    return key === undefined ? undefined : { realm: this._core.id, target: { kind: 'screen', key } };
  }

  /** The reference for one key: the added sources first, then whatever an addon published. */
  reference(key: string): ScreenReference | undefined {
    for (const source of this._sources) {
      const found = source(key);

      if (found !== undefined) { return found; }
    }

    const published = screens(this._core).find(key);

    return isScreenReference(published) ? published : undefined;
  }
}

/**
 * A screen target for a key, carrying its params when they can cross a realm.
 *
 * The request travels as JSON, so params that are not plain data would arrive changed or not at
 * all. They stay behind with a warning instead of going half-intact: the screen still opens, drawn
 * as it is without them.
 */
function screenTarget(key: string, params: NavigateOptions['params']): ScreenTarget {
  if (params === undefined) { return { kind: 'screen', key }; }

  const why = whyNotPlainData(params, 'params');

  if (why !== undefined) {
    console.warn(`[ui] "${key}" opens in its owner's realm without its params, which are not plain data: ${why}`);

    return { kind: 'screen', key };
  }

  return { kind: 'screen', key, params };
}

/**
 * Publish what one part of the build declared, reporting rather than throwing.
 *
 * An addon is free to ship an older runtime than the UI it mounts, and the registries a runtime
 * carries grow over time. A part with nowhere to go is simply not announced: the addon keeps its
 * screens, and the one thing that would have read it elsewhere does without.
 */
function run(publish: () => void): void {
  try {
    publish();
  } catch (error: unknown) {
    console.warn(`[ui] this runtime cannot announce one of the build's declarations: ${String(error)}`);
  }
}

/**
 * This realm's UI presence, built on the first call and kept in the runtime's `core:ui` slot.
 *
 * Every app calls it and gets the same one, so the transport, the navigator and the way back are
 * installed once however many apps an addon installs.
 */
export function uiOf(core: Runtime): UiPresence {
  const filled = core.slot('core:ui');

  if (filled !== undefined) { return filled; }

  const realm = new UiRealm(core);

  core.fill('core:ui', realm);
  realm.start();

  return realm;
}
