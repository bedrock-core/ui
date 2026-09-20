# @bedrock-core/navigation

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

> ⚠️ Beta Status: Active development. Breaking changes will occur until 1.0.0. Pin exact versions for stability. Still not convinced of current navigation API, it had to change because of the compiler, but I'm still not satisfied with what it can offer.

Going from one screen to another in [`@bedrock-core/ui`](https://github.com/bedrock-core/ui), by key.

A compiled screen is drawn from the pack by its title, and its shape is frozen at build. That rules
out the navigator every React app has — a stack of components swapped inside one root — and leaves
the one that fits: a stack of KEYS. `navigate('shop:home')` shows that screen and puts the current
one behind the player; `back()` returns to it.

The key is `<addon>:<name>`, which is what makes this work across addons: a key belonging to an
addon nobody in this realm is running still resolves, from the reference its owner published.

## Install

```bash
yarn add @bedrock-core/navigation
```

It also ships inside the umbrella package as `@bedrock-core/ui/navigation`.

## Usage

A press that opens another screen is a `<Link>`, not a handler — where it leads is then data the
build can read, which is what lets another addon show the screen:

```tsx
/** @jsxImportSource @bedrock-core/ui */
import { Link, Panel, Screen, Text, type JSX } from '@bedrock-core/ui';

export default function Home(): JSX.Element {
  return (
    <Screen>
      <Panel flexDirection={'column'} gap={4}>
        <Link to={'shop:catalogue'}><Text>{'Catalogue'}</Text></Link>
      </Panel>
    </Screen>
  );
}
```

From script, `navigate(key, player)` shows a screen and `back(player)` returns to the one before it.

## Documentation

https://bedrock-core.drav.dev/docs/navigation

## License

MIT © [DrAv0011](https://github.com/DrAv0011)
