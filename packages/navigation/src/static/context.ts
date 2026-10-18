import { createContext } from '@bedrock-core/ui-runtime';
import type { Controller, PageScope } from './controller';
import type { NavigationAction } from './common';

export interface NavigationScope { readonly controller: Controller; readonly page?: PageScope }
export const NavigationContext = createContext<NavigationScope | undefined>(undefined);
export const LINK_ACTION = Symbol('navigation.action');
export interface LinkAction { readonly action: NavigationAction; readonly scope: string; readonly server: boolean }
