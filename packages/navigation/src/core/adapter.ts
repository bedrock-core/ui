import type { Runtime } from '@bedrock-core/server-runtime';
import type { NavigationAdapter, ScreenKey } from '../static/common';
import { registerAdapter } from '../static/adapters';
import { navigateAsync } from '../runtime/navigate';
import type { ScreenMetadata as ScreenDescriptor } from '@bedrock-core/ui-runtime';
import { navigation } from './service';
import type { OwnedScreen } from './screens';
import { NAVIGATION_ADAPTER } from '../static/symbols';

export interface CoreOwnedScreen extends Omit<ScreenDescriptor, 'key'> { readonly key: ScreenKey; readonly owner: string }
export interface CoreScreensRegistry {
  all(owner?: string): readonly CoreOwnedScreen[];
  get(key: ScreenKey): CoreOwnedScreen | undefined;
  find(owner: string, name: string): CoreOwnedScreen | undefined;
}
export interface CoreNavigationAdapter extends NavigationAdapter { readonly screens: CoreScreensRegistry }
const adapters = new WeakMap<Runtime, CoreNavigationAdapter>();
const isCoreScreen = (value: OwnedScreen | undefined): value is CoreOwnedScreen => value !== undefined && /^[^:]+:.+$/.test(value.key);

/** Connects the normal route tree to Core discovery and cross-addon transport once per Runtime. */
export function createCoreNavigationAdapter(core: Runtime): CoreNavigationAdapter {
  const existing = adapters.get(core);

  if (existing !== undefined) { return existing; }

  const service = navigation(core);
  const screens: CoreScreensRegistry = {
    all: owner => service.screens.all(owner).filter(isCoreScreen),
    get: (key) => {
      const value = service.screens.get(key);

      return isCoreScreen(value) ? value : undefined;
    },
    find: (owner, name) => {
      const value = service.screens.find(owner, name);

      return isCoreScreen(value) ? value : undefined;
    },
  };
  const adapter: CoreNavigationAdapter = Object.freeze({ [NAVIGATION_ADAPTER]: true as const, screens: Object.freeze(screens) });

  registerAdapter(adapter, { open: (key, player, params, options) => navigateAsync(key, player, {
    ...params === undefined ? {} : { params }, ...options?.replace === true ? { replace: true } : {},
  }) });
  adapters.set(core, adapter);

  return adapter;
}
