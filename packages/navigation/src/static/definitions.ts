import { whyNotPlainData } from '@bedrock-core/ui-runtime';
import type {
  AnyStaticNavigator, NavigatorType, PublishedScreenParams, ScreenReferenceRoute,
  ScreenSource, StaticConfig, StaticNavigator,
  ScreenBedrockOptions,
} from './common';

export interface RouteDefinition {
  readonly name: string;
  readonly source: ScreenSource;
  readonly config: Readonly<Record<string, unknown>> & { readonly bedrock?: ScreenBedrockOptions };
  readonly group?: Readonly<Record<string, unknown>>;
}

export function isNavigator(value: unknown): value is AnyStaticNavigator {
  return value !== null && typeof value === 'object' && 'type' in value
    && (value.type === 'stack' || value.type === 'tab') && 'config' in value;
}

export function isReference(value: unknown): value is ScreenReferenceRoute {
  return value !== null && typeof value === 'object' && 'type' in value && value.type === 'reference';
}

export function createScreenReference(): ScreenReferenceRoute<PublishedScreenParams> {
  return Object.freeze({ type: 'reference' });
}

/** Copies portable values at the boundary, including params captured by local links. */
export function copyData<T>(value: T): T {
  if (value === undefined) { return value; }

  const error = whyNotPlainData(value, 'navigation');

  if (error !== undefined) { throw new Error(`Navigation requires finite, acyclic JSON data: ${error}`); }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- plain JSON retains its validated input shape
  return JSON.parse(JSON.stringify(value, (_key, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }

    return value;
  })) as T;
}

export function routeDefinitions(navigator: AnyStaticNavigator): readonly RouteDefinition[] {
  const result: RouteDefinition[] = [];
  const names = new Set<string>();

  const add = (screens: StaticConfig['screens'], group?: Readonly<Record<string, unknown>>): void => {
    for (const [name, value] of Object.entries(screens ?? {})) {
      if (name.trim() === '' || names.has(name)) { throw new Error(`Invalid or duplicate navigation route: ${name}`); }

      names.add(name);
      const configured = typeof value === 'object' && value !== null && 'screen' in value;
      const source = configured ? value.screen : value;

      if (typeof source !== 'function' && !isNavigator(source) && !isReference(source)
        && !(typeof source === 'string' && /^[^:]+:.+$/.test(source))) {
        throw new Error(`Navigation route ${name} requires a component, navigator, or published screen reference.`);
      }

      result.push({ name, source, config: configured ? value : {}, group });
    }
  };

  add(navigator.config.screens);

  for (const group of Object.values(navigator.config.groups ?? {})) { add(group.screens, { ...group }); }

  if (result.length === 0) { throw new Error('A navigator requires at least one screen.'); }

  return result;
}

export function defineNavigator<Type extends NavigatorType, Config extends StaticConfig>(type: Type, config: Config): StaticNavigator<Type, Config> {
  const definition = Object.freeze({ type, config: Object.freeze({ ...config,
    screens: config.screens === undefined ? undefined : Object.freeze({ ...config.screens }),
    groups: config.groups === undefined ? undefined : Object.freeze({ ...config.groups }),
  }) });
  const routes = routeDefinitions(definition);
  const initial: unknown = Reflect.get(config, 'initialRouteName');

  if (initial !== undefined && !routes.some(route => route.name === initial)) { throw new Error(`Unknown initial route: ${String(initial)}`); }

  for (const route of routes) {
    if (route.config.initialParams !== undefined) { copyData(route.config.initialParams); }
  }

  return definition;
}
