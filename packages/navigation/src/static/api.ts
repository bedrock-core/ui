import {
  Button, useContext, useEffect, type ButtonProps, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import type {
  NavigationAction, NavigationDestination, NavigationPressEvent, NavigationProp, NavigationState,
} from './common';
import type {
  ParamsIn, RegisteredNavigation, RegisteredRoute, RegisteredScreenName, RootParams,
} from './inference';
import { LINK_ACTION, NavigationContext, type LinkAction, type NavigationScope } from './context';
import { modelAt, type Model } from './state';
import { Link as DestinationLink, type LinkProps as DestinationLinkProps } from '../Link';
import type { PageScope } from './controller';
import { destinationAction, plainParams, readAction } from './actions';

export function currentScope(): NavigationScope {
  const context = useContext(NavigationContext);

  if (context === undefined) { throw new Error('Navigation hooks and route links require a mounted Navigation component.'); }

  return context;
}

function findContainingModel(context: NavigationScope, name: string): Model {
  let model = context.page?.model;

  while (model !== undefined) {
    if (model.routes.some(route => route.name === name)) { return model; }

    model = model.parent;
  }

  const matches: Model[] = [];

  const visit = (model: Model): void => {
    if (model.routes.some(route => route.name === name)) { matches.push(model); }

    for (const child of model.children.values()) { visit(child); }
  };

  visit(context.controller.model);

  if (matches.length !== 1) { throw new Error(`Unknown or ambiguous screen scope: ${name}`); }

  return matches[0];
}

export function useNavigation<Name extends RegisteredScreenName>(name: Name): RegisteredNavigation<Name>;
export function useNavigation(): NavigationProp<RootParams>;

export function useNavigation(name?: string): unknown {
  const context = currentScope();
  const model = name === undefined ? context.controller.model : findContainingModel(context, name);

  return context.controller.navigation(context.page, model.key);
}

export function useRoute<Name extends RegisteredScreenName>(name: Name): RegisteredRoute<Name>;
export function useRoute(): RegisteredRoute;

export function useRoute(name?: string): unknown {
  const context = currentScope();

  if (context.page === undefined) { throw new Error('useRoute requires a screen component.'); }

  if (name !== undefined && context.page.route.name !== name) { throw new Error(`useRoute(${name}) is outside that screen.`); }

  return context.page.route;
}

export function useNavigationState<Name extends RegisteredScreenName, Value>(name: Name, selector: (state: ReturnType<RegisteredNavigation<Name>['getState']>) => Value): Value;
export function useNavigationState<Value>(selector: (state: NavigationState) => Value): Value;

export function useNavigationState(nameOrSelector: string | ((state: never) => unknown), selector?: (state: never) => unknown): unknown {
  const context = currentScope();
  const model = typeof nameOrSelector === 'string' ? findContainingModel(context, nameOrSelector) : context.controller.model;
  const select = typeof nameOrSelector === 'function' ? nameOrSelector : selector!;

  return Reflect.apply(select, undefined, [context.controller.getState(model.key)]);
}

function screenScope(): { readonly context: NavigationScope; readonly page: PageScope } {
  const context = currentScope();

  if (context.page === undefined) { throw new Error('Navigation lifecycle hooks require a screen scope.'); }

  context.controller.requireServer(context.page);

  return { context, page: context.page };
}

export function useIsFocused(): boolean {
  const { context, page } = screenScope();

  return context.controller.isFocused(page);
}

export function useFocusEffect(effect: () => void | (() => void)): void {
  const { context, page } = screenScope();

  useEffect(() => {
    let active = false; let cleanup: (() => void) | undefined;

    const focus = (): void => {
      if (active) { return; }

      active = true; cleanup = effect() ?? undefined;
    };

    const blur = (): void => { if (active) { active = false; cleanup?.(); cleanup = undefined; } };

    const releaseFocus = context.controller.addListener(page, 'focus', focus);
    const releaseBlur = context.controller.addListener(page, 'blur', blur);

    if (context.controller.isFocused(page)) { focus(); }

    return (): void => { releaseFocus(); releaseBlur(); blur(); };
  }, [context.controller, page.body, effect]);
}

export function usePreventRemove(preventRemove: boolean, callback: (event: { readonly data: { readonly action: NavigationAction } }) => void): void {
  const { context, page } = screenScope();

  useEffect(() => context.controller.prevent(page, preventRemove ? (action): void => callback({ data: { action } }) : undefined), [context.controller, page.body, preventRemove, callback]);
}

export type LinkDestination<Scope extends RegisteredScreenName | undefined = undefined> = (
  NavigationDestination<ParamsIn<Scope>> extends infer Destination
    ? Destination extends { readonly name: infer Name; readonly params?: unknown }
      ? Omit<Destination, 'name'> & { readonly screen: Name; readonly in?: Scope; readonly action?: NavigationAction }
      : never : never
) | { readonly action: NavigationAction; readonly screen?: never; readonly params?: never; readonly in?: never };
export interface LinkBehavior { readonly navigation?: 'auto' | 'server' }
export type LinkProps<Scope extends RegisteredScreenName | undefined = undefined> = { readonly in?: Scope } & LinkDestination<Scope>
  & LinkBehavior & Omit<ButtonProps, 'onPress'> & {
    readonly onPress?: (event: NavigationPressEvent & { readonly defaultPrevented: boolean; preventDefault(): void }) => void;
  };

function describedHandler(context: NavigationScope, destination: { readonly in?: unknown; readonly action?: unknown; readonly screen?: unknown; readonly params?: unknown; readonly navigation?: unknown }, interceptor?: LinkProps['onPress']): (event: PressEvent) => void {
  const scope = typeof destination.in === 'string' ? findContainingModel(context, destination.in).key : context.controller.model.key;
  const action = destination.action !== undefined ? readAction(destination.action) : destinationAction('NAVIGATE', [destination.screen, plainParams(destination.params)]);

  const execute = (event: PressEvent): void => {
    let prevented = false;

    interceptor?.({ ...event, get defaultPrevented(): boolean { return prevented; }, preventDefault(): void { prevented = true; } });

    if (!prevented) { context.controller.dispatch(action, scope); }
  };

  const description: LinkAction = { action, scope, server: interceptor !== undefined || destination.navigation === 'server' };

  Object.defineProperty(execute, LINK_ACTION, { value: description });

  return execute;
}

function isDestinationParams(value: unknown): value is NonNullable<DestinationLinkProps['params']> {
  return value !== null && typeof value === 'object';
}

export function Link<const Scope extends RegisteredScreenName | undefined = undefined>(props: LinkProps<Scope>): JSX.Element;
export function Link(props: DestinationLinkProps): JSX.Element;

export function Link(props: Omit<ButtonProps, 'onPress'> & {
  readonly to?: DestinationLinkProps['to']; readonly back?: boolean; readonly replace?: boolean;
  readonly screen?: unknown; readonly action?: unknown; readonly params?: unknown; readonly in?: unknown;
  readonly navigation?: 'auto' | 'server'; readonly onPress?: LinkProps['onPress'];
}): JSX.Element {
  if ('to' in props || 'back' in props) { return DestinationLink({ ...props, params: isDestinationParams(props.params) ? props.params : undefined }); }

  const context = currentScope();
  const { screen, action, params, in: targetScope, navigation, onPress, ...rest } = props;

  return Button({ ...rest, onPress: describedHandler(context, { screen, action, params, in: targetScope, navigation }, onPress) });
}

export function useLinkProps<const Scope extends RegisteredScreenName | undefined = undefined>(
  destination: { readonly in?: Scope } & LinkDestination<Scope> & LinkBehavior,
): { readonly onPress: (event: NavigationPressEvent) => void } {
  return { onPress: describedHandler(currentScope(), destination) };
}

export function scopedModel(context: NavigationScope, key: string): Model {
  const model = modelAt(context.controller.model, key);

  if (model === undefined) { throw new Error(`Unknown navigation container: ${key}`); }

  return model;
}
