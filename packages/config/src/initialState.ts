import type { NavigationState } from '@bedrock-core/navigation';
import type { OpenTarget } from './openTarget';

/**
 * Build the navigator's initial state from a command's {@link OpenTarget}, so a
 * deep-linked command (`core:config drav0011:bc_shop server`) lands on the right
 * screen instead of the default List. `undefined` means "use the navigator's
 * default initial route" (List).
 */
export function buildInitialState(target: OpenTarget): Partial<NavigationState> | undefined {
  if (target.kind === 'list') {
    if (target.addonId === undefined) { return undefined; }

    return {
      routes: [{ key: 'List', name: 'List', params: { selectedId: target.addonId } }],
      index: 0,
    };
  }

  if (target.kind === 'guide') {
    if (target.addonId === undefined) { return undefined; }

    return {
      routes: [
        { key: 'List', name: 'List' },
        { key: 'Guide', name: 'Guide', params: { addonId: target.addonId } },
      ],
      index: 1,
    };
  }

  // config
  const { addonId, scope, scopeId } = target;

  if (addonId === undefined) { return undefined; }

  if (scope) {
    const scopeLabel = `${scope.charAt(0).toUpperCase()}${scope.slice(1)}`;

    return {
      routes: [
        { key: 'List', name: 'List' },
        { key: 'ConfigScope', name: 'ConfigScope', params: { addonId } },
        { key: 'Config', name: 'Config', params: { addonId, scope, entityId: scopeId, breadcrumb: `${addonId} > ${scopeLabel}` } },
      ],
      index: 2,
    };
  }

  return {
    routes: [
      { key: 'List', name: 'List' },
      { key: 'ConfigScope', name: 'ConfigScope', params: { addonId } },
    ],
    index: 1,
  };
}
