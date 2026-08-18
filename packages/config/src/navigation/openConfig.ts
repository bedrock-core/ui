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
import {
  buildSectionTree,
  filterScope,
  filterScopeGroups,
  getScopedGroups,
  getScopedSchema,
  isPureSection,
  type SectionNode,
} from '../config/schema';
import type { AppRoutes } from './routes';

/** Which scope of which addon to open, and what to title it. */
export interface ConfigDestination {
  addonId: string;
  scope: ConfigScope;

  /** The dimension or player being configured. Absent for server scope. */
  entityId?: string;
  breadcrumb: string;

  /** Which section of the scope the form covers. `''` — the whole scope — unless set. */
  path?: string;
}

export async function openConfig(
  navigation: NavigationHelpers<AppRoutes>,
  accessor: RemoteConfigAccessor,
  destination: ConfigDestination,
): Promise<void> {
  const { addonId, scope, entityId, breadcrumb, path = '' } = destination;

  try {
    const values = await getScopeValues(accessor, scope, entityId);

    navigation.navigate('Config', { addonId, scope, entityId, breadcrumb, path, values });
  } catch (error: unknown) {
    console.warn(`[config] fetching '${addonId}' ${scope} values failed: ${String(error)}`);
  }
}

/**
 * Opening one section of the tree, which is where buttons-or-form is decided.
 *
 * A section that holds only sub-sections becomes another `ConfigSection` screen — pushed
 * immediately, since a screen of buttons needs no values. A section that holds settings becomes
 * the modal form, which does, so that branch goes through {@link openConfig} and its fetch.
 *
 * The decision is made per press rather than once at the top: a tree can be pure structure for
 * three levels and then hold settings, and each level answers only for itself.
 */
export async function openSection(
  navigation: NavigationHelpers<AppRoutes>,
  accessor: RemoteConfigAccessor,
  destination: SectionDestination,
): Promise<void> {
  const { addonId, scope, entityId, section, breadcrumb } = destination;

  if (isPureSection(section)) {
    navigation.navigate('ConfigSection', { addonId, scope, entityId, path: section.path, breadcrumb });

    return;
  }

  await openConfig(navigation, accessor, { addonId, scope, entityId, breadcrumb, path: section.path });
}

/** Which section of which scope to open, and what to title it. */
export interface SectionDestination {
  addonId: string;
  scope: ConfigScope;
  entityId?: string;
  section: SectionNode;
  breadcrumb: string;
}

/**
 * The scope root as a section — the entry point every scope row uses.
 *
 * A scope whose top level is pure structure lands on a button screen; one with settings at the
 * top lands straight on the form, exactly as it did before sections were navigable.
 */
export async function openScopeRoot(
  navigation: NavigationHelpers<AppRoutes>,
  accessor: RemoteConfigAccessor,
  destination: ConfigDestination,
): Promise<void> {
  const root = buildSectionTree(
    filterScope(getScopedSchema(accessor), destination.scope),
    filterScopeGroups(getScopedGroups(accessor), destination.scope),
  );

  await openSection(navigation, accessor, { ...destination, section: root });
}

/**
 * Opening one list's editor, which always means fetching first.
 *
 * Same rule as {@link openConfig}: the screen stages an array and writes it on Save, so it has
 * to start from what is actually set rather than from the schema default. Returning the promise
 * keeps the press's interactive transaction open until it settles.
 */
export async function openList(
  navigation: NavigationHelpers<AppRoutes>,
  accessor: RemoteConfigAccessor,
  destination: { addonId: string; scope: ConfigScope; entityId?: string; key: string; breadcrumb: string },
): Promise<void> {
  const { addonId, scope, entityId, key, breadcrumb } = destination;

  try {
    const values = await getScopeValues(accessor, scope, entityId);

    navigation.navigate('ConfigList', { addonId, scope, entityId, key, breadcrumb, values });
  } catch (error: unknown) {
    console.warn(`[config] fetching '${addonId}' ${scope} values failed: ${String(error)}`);
  }
}
