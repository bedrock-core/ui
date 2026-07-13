import type { ScreenProps } from '@bedrock-core/navigation';
import type { GuideRoutes } from '@bedrock-core/guides';
import type { ConfigScope, EntrySchema } from './configUtils';

export type AppRoutes = {
  List: { selectedId?: string } | undefined;
  ConfigScope: { addonId: string };
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
} & GuideRoutes;

export type AppScreen<K extends keyof AppRoutes> = ScreenProps<AppRoutes, K>;

export type { EntrySchema, ConfigScope };
