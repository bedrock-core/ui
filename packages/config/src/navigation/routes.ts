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
  Config: {
    addonId: string;
    scope: ConfigScope;
    entityId?: string;
    breadcrumb: string;

    /** Current effective values — fetched by the navigating screen BEFORE pushing this one. */
    values: Record<string, unknown>;
  };
  ConfigList: {
    addonId: string;
    scope: ConfigScope;
    entityId?: string;
    fieldKey: string;
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
