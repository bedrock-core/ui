# @bedrock-core/navigation

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Going from one screen to another in [`@bedrock-core/ui`](https://github.com/bedrock-core/ui), by
key.

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

## What it gives you

- `navigate(key, player, options?)` — show that screen, putting the current one behind the player.
  `options.params` fills what a generic screen's layout reserved
- `replace(key, player)` — show it in the current screen's place, leaving the stack as deep as it is
- `reset(key, player)` — show it as the only screen the player has been on
- `back(player)` — show the screen navigated from; `false` when there is none
- `canGoBack(player)` / `currentKey(player)` / `historyOf(player)` — where the player is and what is
  behind them
- `useNavigation()` — all of it bound to the player the screen is being shown to, plus `key` and
  `history` for the screen itself
- `provideReferences(lookup)` — what resolves a key this bundle did not compile
- `ScreenKey` / `ScreenKeys` — the key type each addon's generated module augments, so its own keys
  autocomplete while another addon's still pass

Coming from the stack navigator this replaced: `push` is `navigate` (it always stacks),
`goBack` is `back`, `reset` takes a key rather than a route array, and `setParams` is a
`replace(key, player, { params })` — a compiled screen is drawn from the pack each time it is shown,
so new params mean showing it again rather than mutating a route entry.

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
        <Link to={'other_addon:guide_home'}><Text>{'Their guide'}</Text></Link>
      </Panel>
    </Screen>
  );
}
```

From script, or inside a screen:

```ts
import { back, navigate, useNavigation } from '@bedrock-core/navigation';

navigate('shop:catalogue', player);
back(player);

// inside a screen
const navigation = useNavigation();

navigation.navigate('shop:catalogue');
```

## Resolving another addon's screens

An addon publishes every static screen it compiled — per screen the title, the value each entry is
shown with and the key each press leads to — and a realm holding that table can show them from the
pack every client already has:

```ts
import { provideReferences } from '@bedrock-core/navigation';

core.register({ ..., screens: uiReference() });     // in the owning addon

provideReferences(key => core.screens.find(key));   // in the realm that shows them
```

`@bedrock-core/config` installs a lookup of its own when the shared UI is mounted, so an addon using
it needs neither call.

Until something is installed, a key this bundle did not compile warns and shows nothing.

## Documentation

- [navigation](https://bedrock-core.drav.dev/docs/ui/navigation) — keys, the stack, and references

## License

MIT © [DrAv0011](https://github.com/DrAv0011)
