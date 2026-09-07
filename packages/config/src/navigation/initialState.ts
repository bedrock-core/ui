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
 *
 * `scopeIsSections` says the scope's top level holds only sub-sections, so the destination is the
 * section screen rather than the form. It needs no values — and must not wait for them, since a
 * scope with nothing at its top level has no scalars to fetch and would otherwise stop at the
 * picker forever.
 */
export function buildInitialState(
  target: OpenTarget,
  values?: Record<string, unknown>,
  canPickScope = true,
  scopeIsSections = false,
  listCompiled = false,
  pickerCompiled = false,
): Partial<NavigationState> | undefined {
  // With the compiled list, the stack starts past it: a screen at the bottom
  // of the stack returns to the compiled list through `openUi`, not to a
  // serialized list underneath.
  const list = (addonId: string): NavigationState['routes'] => (listCompiled ? [] : [listRoute(addonId)]);

  if (target.kind === 'list') {
    if (target.addonId === undefined) { return undefined; }

    return { routes: [listRoute(target.addonId)], index: 0 };
  }

  if (target.kind === 'guide') {
    if (target.addonId === undefined) { return undefined; }

    const routes = [
      ...list(target.addonId),
      { key: 'Guide', name: 'Guide', params: { addonId: target.addonId } },
    ];

    return { routes, index: routes.length - 1 };
  }

  // config
  const { addonId, scope, scopeId, path = '', list: listKey, trail } = target;

  if (addonId === undefined) { return undefined; }

  // With the compiled picker, the stack starts past it the way it starts past
  // the compiled list: a screen at the bottom returns to it through `openUi`.
  const picker = canPickScope && !pickerCompiled
    ? [{ key: 'ConfigScope', name: 'ConfigScope', params: { addonId } }]
    : [];

  const scopeLabel = scope === undefined ? '' : `${scope.charAt(0).toUpperCase()}${scope.slice(1)}`;
  const breadcrumb = trail ?? `${addonId} > ${scopeLabel}`;

  // A roster scope with no entity named yet: the roster is where one is picked.
  if ((scope === 'dimension' || scope === 'player') && scopeId === undefined && canPickScope) {
    const routes = [
      ...list(addonId),
      ...picker,
      { key: 'EntityList', name: 'EntityList', params: { addonId, scope, breadcrumb } },
    ];

    return { routes, index: routes.length - 1 };
  }

  if (scope && listKey !== undefined && values) {
    const routes = [
      ...list(addonId),
      ...picker,
      { key: 'ConfigList', name: 'ConfigList', params: { addonId, scope, entityId: scopeId, key: listKey, breadcrumb, values } },
    ];

    return { routes, index: routes.length - 1 };
  }

  if (scope && scopeIsSections) {
    const routes = [
      ...list(addonId),
      ...picker,
      { key: 'ConfigSection', name: 'ConfigSection', params: { addonId, scope, entityId: scopeId, path, breadcrumb } },
    ];

    return { routes, index: routes.length - 1 };
  }

  if (scope && values) {
    const routes = [
      ...list(addonId),
      ...picker,
      { key: 'Config', name: 'Config', params: { addonId, scope, entityId: scopeId, path, breadcrumb, values } },
    ];

    return { routes, index: routes.length - 1 };
  }

  // No scope resolved, so the picker is the destination. Without it there is nowhere further to
  // go than the list, which is where a player who cannot pick a scope belongs anyway.
  const routes = picker.length === 0 ? [listRoute(addonId)] : [...list(addonId), ...picker];

  return { routes, index: routes.length - 1 };
}
