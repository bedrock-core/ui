import type { NavigationState } from '@bedrock-core/navigation';
import type { OpenTarget } from './openTarget';

/**
 * The route every stack starts from.
 *
 * Commands are per-addon, so a request always knows which addon it came from and the list under
 * it is pre-selected accordingly. That matters on the way back out: pressing Back from a guide
 * or a config screen should land on the addon you were just looking at, not on whichever one
 * happens to sort first.
 */
function listRoute(selectedId?: string): NavigationState['routes'][number] {
  return { key: 'List', name: 'List', params: selectedId === undefined ? undefined : { selectedId } };
}

/**
 * Build the navigator's initial state from a command's {@link OpenTarget}, so a request lands on
 * the screen it asked for instead of the default List. `undefined` means "use the navigator's
 * default initial route" (List, nothing selected).
 *
 * `values` are the target scope's effective values, fetched by the caller before mounting.
 * Without them the `Config` route would render every field at its schema default — see
 * `prefetchScopeValues` in `mount.tsx` for why the screen cannot fetch its own. A target that
 * names a scope but arrives with no values stops one screen short, at the scope picker, rather
 * than showing wrong ones.
 *
 * `canPickScope` is false for a player with only one scope to pick. The picker is then left out
 * of the stack entirely rather than merely landed past, so backing out of their settings returns
 * to the list instead of a screen with a single enabled row.
 */
export function buildInitialState(
  target: OpenTarget,
  values?: Record<string, unknown>,
  canPickScope = true,
): Partial<NavigationState> | undefined {
  if (target.kind === 'list') {
    if (target.addonId === undefined) { return undefined; }

    return { routes: [listRoute(target.addonId)], index: 0 };
  }

  if (target.kind === 'guide') {
    if (target.addonId === undefined) { return undefined; }

    return {
      routes: [
        listRoute(target.addonId),
        { key: 'Guide', name: 'Guide', params: { addonId: target.addonId } },
      ],
      index: 1,
    };
  }

  // config
  const { addonId, scope, scopeId } = target;

  if (addonId === undefined) { return undefined; }

  const picker = canPickScope
    ? [{ key: 'ConfigScope', name: 'ConfigScope', params: { addonId } }]
    : [];

  if (scope && values) {
    const scopeLabel = `${scope.charAt(0).toUpperCase()}${scope.slice(1)}`;
    const routes = [
      listRoute(addonId),
      ...picker,
      { key: 'Config', name: 'Config', params: { addonId, scope, entityId: scopeId, breadcrumb: `${addonId} > ${scopeLabel}`, values } },
    ];

    return { routes, index: routes.length - 1 };
  }

  // No scope resolved, so the picker is the destination. Without it there is nowhere further to
  // go than the list, which is where a player who cannot pick a scope belongs anyway.
  return picker.length === 0
    ? { routes: [listRoute(addonId)], index: 0 }
    : { routes: [listRoute(addonId), ...picker], index: 1 };
}
