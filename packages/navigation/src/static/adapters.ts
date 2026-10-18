import type { Player } from '@minecraft/server';
import type { NavigationAdapter } from './common';

export interface AdapterBackend {
  open(key: string, player: Player, params?: Readonly<Record<string, unknown>>, options?: { readonly replace?: boolean }): Promise<boolean>;
}
const backends = new WeakMap<NavigationAdapter, AdapterBackend>();

export function registerAdapter(adapter: NavigationAdapter, backend: AdapterBackend): void { backends.set(adapter, backend); }

export function adapterBackend(adapter: NavigationAdapter): AdapterBackend {
  const backend = backends.get(adapter);

  if (backend === undefined) { throw new Error('Unknown navigation adapter. Use createCoreNavigationAdapter for Core transport.'); }

  return backend;
}
