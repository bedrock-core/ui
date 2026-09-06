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
import type { AppRoutes } from './routes';

/** Back from a config screen: the screen below, or the addon's scope picker. */
export function backToPicker(navigation: NavigationHelpers<AppRoutes>, core: Runtime, player: Player, addonId: string): unknown {
  return navigation.canGoBack() ? navigation.goBack() : openUi(core, player, { kind: 'config', addonId });
}
