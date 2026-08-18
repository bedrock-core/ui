/**
 * The screen stack's route map: every screen this UI can be on, and what it needs to render.
 *
 * Params are the whole contract between screens — there is no shared mutable store — which is
 * why `values` is carried rather than fetched: see `Config` and `mount.tsx`.
 */
import type { ScreenProps } from '@bedrock-core/navigation';
import type { ConfigScope } from '../types';

export type AppRoutes = {
  List: { selectedId?: string } | undefined;
  ConfigScope: { addonId: string };
  /** One addon's guide — a self-contained `createGuide` component picked by `addonId`. */
  Guide: { addonId: string };
  EntityList: {
    addonId: string;
    scope: 'dimension' | 'player';
    breadcrumb: string;
  };
  /**
   * A level of the config tree that holds only sub-sections. `path` is its dot-path within the
   * scope, `''` for the scope root. No `values`: this screen renders buttons, and only the form
   * at the end of the branch needs them.
   */
  ConfigSection: {
    addonId: string;
    scope: ConfigScope;
    entityId?: string;
    path: string;
    breadcrumb: string;
  };
  /**
   * The editor for ONE list setting, reached from a section screen. `key` is the list's dot-path
   * within the scope. Carries `values` for the same reason `Config` does — the screen stages
   * edits and cannot fetch its own.
   */
  ConfigList: {
    addonId: string;
    scope: ConfigScope;
    entityId?: string;
    key: string;
    breadcrumb: string;
    values: Record<string, unknown>;
  };
  Config: {
    addonId: string;
    scope: ConfigScope;
    entityId?: string;

    /** Which section of the scope this form covers. `''` is the whole scope. */
    path: string;
    breadcrumb: string;

    /** Current effective values — fetched by the navigating screen BEFORE pushing this one. */
    values: Record<string, unknown>;
  };
  ConfirmReset: {
    addonId: string;
    scope: ConfigScope;
    entityId?: string;

    /**
     * What the question names — the scope's label, or the dimension/player being reset.
     * Carried rather than derived: `entityId` is an id (a player's is a number), and the
     * screen has no roster to look a name up in.
     */
    target: string;
    breadcrumb: string;
  };
};

export type AppScreen<K extends keyof AppRoutes> = ScreenProps<AppRoutes, K>;
