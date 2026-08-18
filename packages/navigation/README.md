# @bedrock-core/navigation

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Stack-based navigation for [`@bedrock-core/ui`](https://github.com/bedrock-core/ui), inspired by
React Navigation and adapted to the runtime's one-render-per-player model. Screens are components,
transitions are actions, and route params are typed by a route map you declare once.

> ⚠️ MVP scope: stack navigation only. No tabs, nested navigators, deep linking, state
> persistence, transition animations, or keep-alive for inactive routes.

## Install

```bash
yarn add @bedrock-core/navigation
```

It also ships inside the umbrella package as `@bedrock-core/ui/navigation`.

## What it gives you

- `NavigationContainer` — the provider that holds a player's navigation state; the root you pass
  to `render()`
- `createStackNavigator(config)` — returns `{ Navigator, routeNames, initialRouteName }` from a
  `{ screens, initialRouteName? }` config; a screen entry is a component or
  `{ screen, initialParams }`
- `useNavigation()` — `navigate`, `push`, `goBack`, `canGoBack`, `reset`, `setParams`, `getState`
- `useRoute()` — the active `{ key, name, params }`
- `stackReducer` with its `StackAction` union and `ScreenDefaults` map, for hosts that seed or
  drive the stack themselves (`@bedrock-core/config` builds an initial state from a fired command
  this way)

## Usage

```tsx
/** @jsxImportSource @bedrock-core/ui */
import { NavigationContainer, createStackNavigator, type ScreenProps } from '@bedrock-core/navigation';
import { Button, Text, render, type JSX } from '@bedrock-core/ui';
import type { Player } from '@minecraft/server';

type AppRoutes = { Home: undefined; Profile: { userId: number } };

function HomeScreen({ navigation }: ScreenProps<AppRoutes, 'Home'>): JSX.Element {
  return (
    <Button onPress={(): void => navigation.navigate('Profile', { userId: 42 })}>
      <Text>{'Go to Profile'}</Text>
    </Button>
  );
}

function ProfileScreen({ navigation, route }: ScreenProps<AppRoutes, 'Profile'>): JSX.Element {
  return (
    <>
      <Text>{`Profile: ${route.params.userId}`}</Text>
      <Button onPress={(): void => navigation.goBack()}>
        <Text>{'Back'}</Text>
      </Button>
    </>
  );
}

const Stack = createStackNavigator<AppRoutes>({
  initialRouteName: 'Home',
  screens: { Home: HomeScreen, Profile: { screen: ProfileScreen, initialParams: { userId: 0 } } },
});

export function openApp(player: Player): void {
  render(
    <NavigationContainer>
      <Stack.Navigator />
    </NavigationContainer>,
    player,
  );
}
```

**One `render()` per player.** Navigating does not call `render()` again — button callbacks feed
the runtime's existing present cycle, which re-presents the same screen with the new route. Screen
components must never call `render()` themselves.

## Documentation

- [navigation](https://bedrock-core.drav.dev/docs/ui/navigation) — the model, quick start, and how
  it works
- [`createStackNavigator`](https://bedrock-core.drav.dev/docs/ui/navigation/createStackNavigator) ·
  [`useNavigation`](https://bedrock-core.drav.dev/docs/ui/navigation/useNavigation) ·
  [`useRoute`](https://bedrock-core.drav.dev/docs/ui/navigation/useRoute)

## License

MIT
