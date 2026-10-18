/** @jsxImportSource @bedrock-core/ui-runtime */
import {
  useCompiledData, useEffect, useRef, useRenderOwner,
  type FunctionComponent, type JSX,
} from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import type {
  AnyStaticNavigator, NavigationContainerProps, NavigationContainerRef, PlayerNavigationContainerRef,
  StaticNavigationOptions, NavigationState, Route,
} from './common';
import { Controller } from './controller';
import { copyData } from './definitions';
import { baseBodies, isNativePlan } from './plan';
import { RootContent } from './view';
import { createModel, leaf } from './state';
import { ensureNavigationLifecycle } from '../runtime/lifecycle';
import { adapterBackend } from './adapters';
import { readAction } from './actions';

interface RefRegistry { readonly controllers: Map<string, Controller> }
const registries = new WeakMap<object, RefRegistry>();
const refOperations = new Set(['navigate', 'goBack', 'canGoBack', 'isFocused', 'getState', 'getId', 'getParent',
  'reset', 'dispatch', 'setParams', 'replaceParams', 'pushParams', 'setOptions', 'addListener', 'removeListener']);

/** Refs address mounted roots explicitly by player; no default player can leak across commands. */
export function createNavigationContainerRef<Root extends AnyStaticNavigator>(): NavigationContainerRef<Root> {
  const registry: RefRegistry = { controllers: new Map() };
  const ref = Object.freeze({
    forPlayer(player: Player): PlayerNavigationContainerRef<Root> {
      const current = (): Controller | undefined => registry.controllers.get(player.id);

      const required = (): Controller => {
        const controller = current();

        if (controller?.ready !== true) { throw new Error('This player has no mounted navigation root. Open the screen with render first.'); }

        return controller;
      };

      const handle = {
        isReady: (): boolean => current()?.ready === true,
        getRootState: (): NavigationState | undefined => current()?.ready === true ? current()!.getState() : undefined,
        getCurrentRoute: (): Route | undefined => current()?.ready === true ? copyData(leaf(current()!.state)) : undefined,
        resetRoot: (state: Parameters<PlayerNavigationContainerRef<Root>['resetRoot']>[0]): void => required().dispatch(readAction({ type: 'RESET', payload: state })),
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the proxy exposes only the declared operations and resolves each through this root's validated controller
      return new Proxy(handle, { get(target, property, receiver): unknown {
        if (Reflect.has(target, property)) { return Reflect.get(target, property, receiver); }

        if (typeof property !== 'string' || !refOperations.has(property)) { return undefined; }

        return (...args: unknown[]): unknown => {
          const method: unknown = Reflect.get(required().navigation(), property);

          if (typeof method !== 'function') { throw new Error(`Unknown navigation ref operation: ${String(property)}`); }

          return Reflect.apply(method, undefined, args);
        };
      } }) as unknown as PlayerNavigationContainerRef<Root>;
    },
  });

  registries.set(ref, registry);

  return ref;
}

/** Mounts a static tree inside the author's form host. Rendering remains owned by ui-runtime. */
export function createStaticNavigation<Root extends AnyStaticNavigator>(
  navigator: Root, options: StaticNavigationOptions = {},
): FunctionComponent<NavigationContainerProps<Root>> {
  const id: unknown = Reflect.get(navigator.config, 'id');

  if (options.adapter !== undefined) { adapterBackend(options.adapter); }

  const model = createModel(navigator, typeof id === 'string' ? id : 'root');
  const dataKey = `navigation:${model.key}`;
  const initialBodies = baseBodies(model);
  const settings = { ...options, clientNavigation: { ...options.clientNavigation } };

  return function Navigation(props): JSX.Element {
    const owner = useRenderOwner();

    if (owner.kind === 'player') { ensureNavigationLifecycle(); }

    const controllerRef = useRef<Controller | undefined>(undefined);

    if (controllerRef.current === undefined) {
      controllerRef.current = new Controller(model, settings, owner.kind === 'player' ? owner.player : undefined, props.initialState, props);
    }

    const controller = controllerRef.current;

    const compiled = useCompiledData(dataKey);

    if (compiled !== undefined && !isNativePlan(compiled)) { throw new Error('Invalid compiled navigation data. Rebuild this screen.'); }

    const registry = props.ref === undefined ? undefined : registries.get(props.ref);

    if (props.ref !== undefined && registry === undefined) { throw new Error('Navigation ref must be created with createNavigationContainerRef.'); }

    useEffect(() => {
      if (owner.kind !== 'player') { return; }

      const previous = registry?.controllers.get(owner.id);

      if (previous !== undefined && previous !== controller && previous.ready) { throw new Error('A navigation ref already owns a mounted root for this player.'); }

      registry?.controllers.set(owner.id, controller);
      controller.activate();

      return (): void => {
        controller.dispose();

        if (registry?.controllers.get(owner.id) === controller) { registry.controllers.delete(owner.id); }
      };
    }, [controller, registry]);

    return <RootContent controller={controller} bodies={compiled?.bodies ?? initialBodies} dataKey={dataKey} plan={compiled} />;
  };
}
