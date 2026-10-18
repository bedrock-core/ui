import type { JSX } from '@bedrock-core/ui-runtime';
import type {
  AnyStaticNavigator, NavigationProp, NavigatorType, Route, StaticGroups, StaticNavigator, StaticScreens,
} from './common';
import type { CheckedGroups, CheckedScreens } from './inference';
import type { StackNavigationOptions, StackNavigatorConfig } from './stack';
import type { TopTabNavigationOptions, TopTabNavigatorConfig } from './tabs';
import { defineNavigator } from './definitions';

/** Pure layout composed around each compile-visible page, including its configured header and tab bar. */
export interface NavigatorLayoutProps {
  readonly route: Route;
  readonly navigation: NavigationProp;
  readonly children: JSX.Element;
}
export type NavigatorLayout = (props: NavigatorLayoutProps) => JSX.Element;

type ConfigFor<Type extends NavigatorType, Screens extends StaticScreens, Groups extends StaticGroups>
  = Type extends 'stack' ? StackNavigatorConfig<Screens, Groups> : TopTabNavigatorConfig<Screens, Groups>;
type OptionsFor<Type extends NavigatorType> = Type extends 'stack' ? StackNavigationOptions : TopTabNavigationOptions;
type FactoryConfig<Type extends NavigatorType, Screens extends StaticScreens, Groups extends StaticGroups>
  = ConfigFor<Type, Screens, Groups>
    & { readonly screens?: CheckedScreens<NoInfer<Screens>, OptionsFor<Type>>; readonly groups?: CheckedGroups<NoInfer<Groups>, OptionsFor<Type>> }
    & ({ readonly screens: Screens } | { readonly groups: Groups });

export interface NavigatorFactory<Type extends NavigatorType> {
  <const Screens extends StaticScreens = Record<never, never>, const Groups extends StaticGroups = Record<never, never>>(
    config: FactoryConfig<Type, Screens, Groups>,
  ): StaticNavigator<Type, ConfigFor<Type, Screens, Groups>>;
}

const layouts = new WeakMap<AnyStaticNavigator, NavigatorLayout>();

export function navigatorLayout(definition: AnyStaticNavigator): NavigatorLayout | undefined { return layouts.get(definition); }

/**
 * Creates a statically configured navigator using the shared stack or tab router.
 * Layouts must retain children and have compile-visible geometry; route changes still use the shared native budget.
 * Arbitrary routers and action vocabularies are outside this extension contract.
 */
export function createNavigatorFactory<Type extends NavigatorType>(type: Type, layout?: NavigatorLayout): NavigatorFactory<Type> {
  if (type !== 'stack' && type !== 'tab') { throw new Error('A navigator factory requires stack or tab behavior.'); }

  return function create<const Screens extends StaticScreens = Record<never, never>, const Groups extends StaticGroups = Record<never, never>>(
    config: FactoryConfig<Type, Screens, Groups>,
  ): StaticNavigator<Type, ConfigFor<Type, Screens, Groups>> {
    const definition = defineNavigator(type, config);

    if (layout !== undefined) { layouts.set(definition, layout); }

    return definition;
  };
}
