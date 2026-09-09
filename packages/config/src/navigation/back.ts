/**
 * Where Back leads from a screen that may sit at the bottom of the stack.
 *
 * With the compiled list and picker, a serialized screen can be the first on
 * its stack; Back then opens the compiled screen beneath it through `openUi`
 * rather than popping nothing.
 */
import type { NavigationHelpers } from '@bedrock-core/navigation';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { openUi } from '../mount';
import type { ConfigScope } from '../types';
import type { AppRoutes } from './routes';

/** Back from a config screen: the screen below, or the addon's scope picker. */
export function backToPicker(navigation: NavigationHelpers<AppRoutes>, core: Runtime, player: Player, addonId: string): unknown {
  return navigation.canGoBack() ? navigation.goBack() : openUi(core, player, { kind: 'config', addonId });
}

/**
 * Back from a level of the config tree: the screen below, or the level above
 * this one — the parent section, the roster, or the picker — opened afresh.
 */
export function backToParent(
  navigation: NavigationHelpers<AppRoutes>,
  core: Runtime,
  player: Player,
  level: { addonId: string; scope: ConfigScope; entityId?: string; path: string; breadcrumb: string },
): unknown {
  if (navigation.canGoBack()) {
    return navigation.goBack();
  }

  const { addonId, scope, entityId, path, breadcrumb } = level;

  if (path === '') {
    return openUi(core, player, scope === 'server' || entityId === undefined
      ? { kind: 'config', addonId }
      : { kind: 'config', addonId, scope });
  }

  return openUi(core, player, {
    kind: 'config',
    addonId,
    scope,
    scopeId: entityId,
    path: path.slice(0, Math.max(0, path.lastIndexOf('.'))),
    trail: breadcrumb.split(' > ').slice(0, -1),
  });
}
