/**
 * Moving to the `Config` screen, which always means fetching first.
 *
 * `Config` presents a native modal built from the values handed to it, so it cannot fetch its
 * own — arriving empty and re-rendering would present the form twice, which reads to the player
 * as having to press the button twice. Every route into it therefore fetches before navigating.
 *
 * Returning the promise matters as much as awaiting it: the presenter holds the press's
 * interactive transaction open until it settles, which is what makes the form re-present ONCE,
 * on the new screen. A fire-and-forget fetch re-presents the old screen first.
 *
 * On failure the caller stays where it is and the failure is logged — better than navigating to
 * a screen full of defaults that are not what is actually set.
 */
import type { NavigationHelpers } from '@bedrock-core/navigation';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';
import type { ConfigScope } from '../types';
import { getScopeValues } from '../config/values';
import type { AppRoutes } from './routes';

/** Which scope of which addon to open, and what to title it. */
export interface ConfigDestination {
  addonId: string;
  scope: ConfigScope;

  /** The dimension or player being configured. Absent for server scope. */
  entityId?: string;
  breadcrumb: string;
}

export async function openConfig(
  navigation: NavigationHelpers<AppRoutes>,
  accessor: RemoteConfigAccessor,
  destination: ConfigDestination,
): Promise<void> {
  const { addonId, scope, entityId, breadcrumb } = destination;

  try {
    const values = await getScopeValues(accessor, scope, entityId);

    navigation.navigate('Config', { addonId, scope, entityId, breadcrumb, values });
  } catch (error: unknown) {
    console.warn(`[config] fetching '${addonId}' ${scope} values failed: ${String(error)}`);
  }
}
