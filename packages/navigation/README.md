# @bedrock-core/navigation

Stack-based navigation system for @bedrock-core/ui.

## ⚠️ MVP Status

This is a stack-only navigator. It does **not** support:
- Tabs or other navigator types
- Nested navigators
- Deep linking
- State persistence
- Transition animations
- Keep-alive inactive routes

## Core API

- **`NavigationContainer`** – Context provider that initializes and manages navigation state per player session. Wrap the entire navigator tree in this component as the root passed to `render()`.
- **`createStackNavigator(config)`** – Factory that returns a `{ Navigator, Screen }` object. Register screens by passing a `{ screens: { [name]: component | { screen, initialParams } } }` config.
- **`Screen`** – *(from `createStackNavigator`)* Declare a named, routed screen within the navigator.
- **`useNavigation<TRoutes>()`** – Hook returning a `NavigationHelpers<TRoutes>` object with: `navigate(name, params?)`, `push(name, params?)`, `goBack()`, `canGoBack()`, `reset(state)`, `setParams(name, params)`, `getState()`.
- **`useRoute<TRoutes, K>()`** – Hook returning the current `RouteObject<TRoutes[K]>` with shape `{ key: string, name: K, params: TRoutes[K] }`. Must be called from within a screen component.

## Usage

```tsx
import { NavigationContainer, createStackNavigator, Screen } from '@bedrock-core/navigation';
import { useNavigation, useRoute } from '@bedrock-core/navigation';

// Define screens
function HomeScreen() {
  const navigation = useNavigation();
  return (
    <Button onPress={() => navigation.navigate('Profile', { userId: 42 })}>
      Go to Profile
    </Button>
  );
}

function ProfileScreen() {
  const route = useRoute();
  const { userId } = route.params;
  const navigation = useNavigation();
  return (
    <>
      <Text>Profile: {userId}</Text>
      <Button onPress={() => navigation.goBack()}>Back</Button>
    </>
  );
}

// Create navigator
const Stack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      initialParams: { userId: 0 }
    }
  }
});

// Render once per player
render(
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Home" />
  </NavigationContainer>,
  player
);
```

## Key Architecture

1. **Single root render per player** – Navigation state changes do NOT trigger new `render()` calls.
2. **Action-driven updates** – All screen transitions happen through `navigate`, `push`, `goBack`, etc.
3. **Reuses present loop** – Button callbacks naturally trigger screen updates via the runtime's present cycle.
4. **No nested renders** – Screen components must never call `render()` directly.

See [comprehensive documentation](../../docs/) for more details.
