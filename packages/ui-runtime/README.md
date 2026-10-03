# @bedrock-core/ui-runtime

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Beta. The core of `@bedrock-core/ui`: a JSX runtime, component primitives, hooks and form/container
hosts. Screens and their helper controls are compiled into each addon's resource pack; the runtime
carries their current values and handles input through Minecraft's native forms and containers.

## Install

```bash
yarn add @bedrock-core/ui           # the umbrella package — re-exports this one at its root
yarn add @bedrock-core/ui-runtime   # or standalone
```

Point TypeScript at the JSX runtime (`@bedrock-core/ui-runtime` works as the import source too):

```jsonc
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@bedrock-core/ui" } }
```

The shared resource pack (`core-ui-*.mcpack`) supplies textures. Enable it in the
world alongside the addon, and compile the addon's screens with the matching UI compiler.

## Usage

```tsx
/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button, Panel, Screen, Text, render, useState, type JSX } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';

// The root names the host: <Screen> is an action form, <Form> a native modal,
// <Container> a compiled container screen. There is no default.
function Counter(): JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Screen>
      <Panel flexDirection={'column'} padding={6} gap={4}>
        <Text>{`Count: ${count}`}</Text>
        <Button onPress={(): void => { setCount(prev => prev + 1); }}>
          <Text>{'§a+1'}</Text>
        </Button>
      </Panel>
    </Screen>
  );
}

// One render() per player — state changes re-present the same screen, they never re-render.
export function openCounter(player: Player): void {
  render(Counter, player);
}
```

## Documentation

https://bedrock-core.drav.dev/docs/ui

## License

MIT
