/**
 * @bedrock-core/navigation - Stack navigation system MVP
 *
 * A single-root-render navigation library for Minecraft Bedrock UI.
 * Inspired by React Navigation but designed for the ui-runtime's presentation loop.
 *
 * Key principle: one render() call per player, all screen transitions via navigation actions.
 */

export { NavigationContainer } from './context';
export { createStackNavigator } from './navigators/stack-navigator';
export { useNavigation, useRoute } from './hooks';
export { stackReducer, type StackAction, type ScreenDefaults } from './reducer';

export type {
  Route,
  NavigationState,
  StackNavigatorOptions,
  NavigationHelpers,
  RouteObject,
  ScreenProps,
  ScreenComponent,
  ScreensMap,
  RouteEntry,
  ResetRouteEntry,
} from './types';
