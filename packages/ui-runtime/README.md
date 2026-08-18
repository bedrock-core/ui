# @bedrock-core/ui-runtime

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.

The core of `@bedrock-core/ui`: a JSX runtime, the component primitives, the hook system, and the
serializer that packs a laid-out tree into the payload string Minecraft's own server forms carry.
A JSON UI **render pack** decodes those bytes in-game and paints the screen, which is what buys
layouts `@minecraft/server-ui` cannot express.

## Install

```bash
yarn add @bedrock-core/ui           # the umbrella package — re-exports this one at its root
yarn add @bedrock-core/ui-runtime   # or standalone
```

Point TypeScript at the JSX runtime (`@bedrock-core/ui-runtime` works as the import source too):

```jsonc
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@bedrock-core/ui" } }
```

The matching render pack (`core-ui-v*.mcpack`) ships with every release and must be installed in
the world — see [Render pack](https://bedrock-core.drav.dev/docs/ui/ui-runtime/render-pack).

## What it gives you

- **Components** — `Panel`, `Text`, `Image`, `Button`, `Fragment`, `Background`, `Scroll`,
  `ItemRenderer`, the modal-backed `Input` / `Dropdown` / `Slider`, and the `Form` namespace
  (`Form.Toggle`, `.Slider`, `.Dropdown`, `.InlineSelect`, `.Input`, `.Option`, `.Button`)
- **Hooks** — `useState`, `useReducer`, `useRef`, `useEffect`, `useContext`, `useEvent`,
  `usePlayer`, `useExit`
- **Two backends** — an `ActionFormData` screen by default; a `<Form>` anywhere on the tree
  switches the render to a native `ModalFormData` with one atomic submit
- **Flex layout** — [`@bedrock-core/flexbox`](https://bedrock-core.drav.dev/docs/ui/flexbox)
  resolves every box to absolute texels before serialization
- **Localization with no wiring** — `Text` accepts a literal, a translation key or a `RawMessage`
  on one channel; `render()` injects the viewing player's resolver at every root
- **Extension points** — `createContext`, and `registerComponent` for
  [custom native components](https://bedrock-core.drav.dev/docs/ui/ui-runtime/api/custom-native-components)
  your own resource pack decodes

## Usage

```tsx
/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button, Panel, Text, render, useState, type JSX } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';

function Counter(): JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{`Count: ${count}`}</Text>
      <Button onPress={(): void => { setCount(prev => prev + 1); }}>
        <Text>{'§a+1'}</Text>
      </Button>
    </Panel>
  );
}

// One render() per player — state changes re-present the same screen, they never re-render.
export function openCounter(player: Player): void {
  render(Counter, player);
}
```

## Wire format

Reference for anyone writing JSON UI that decodes these payloads. The **v0008 control block**
(byte map, `fontType` at `[606-688]`, what changed and why) is documented in full on
[Render pack](https://bedrock-core.drav.dev/docs/ui/ui-runtime/render-pack); the decoder-side
mechanics below live here, at the source (`src/core/serializer.ts`).

Every payload opens with a 9-byte header — `bcui` + `VERSION`, currently **`bcuiv0008`**. Each
field is then `type prefix` + `value padded with ';'` + a `1-byte marker` (markers come from the
ordered alphabet `0-9A-Za-z-_`, so an element carries at most **64** props; index = field order,
and reordering breaks every backward offset).

| Type | Prefix | Value | Marker | Full | Notes |
|---|---|---|---|---|---|
| String | `s:` | 80 | 1 | 83 | hard 80-**byte** cap; over it `serializeProps()` throws |
| Number | `n:` | 80 | 1 | 83 | integer texels — JSON UI ignores decimal points |
| Boolean | `b:` | 5 | 1 | 8 | `'true'` / `'false'` |
| Reserved | — | var | — | var | no prefix/marker, so JSON UI can skip it wholesale |
| Tail | — | var | — | var | last field only, uncapped — `Text` content, `Image` texture |

The **tail** is the one exception to fixed widths: everything before it decodes at a fixed offset,
so the final field of a terminal payload may be emitted raw. A `RawMessage` tail turns the payload
into `{ rawtext: [{ text: <fixed fields> }, <tail>] }`, resolved by the **client**. An `<Image>` is
terminal too, so its `texture` is the tail at `[1024]` — texture paths have no length cap.

**Decoding** is a progressive slice-then-subtract — three bindings per field. Subtraction removes
*all* occurrences, which is exactly why every field ends in a unique marker, and why padding is
stripped only after the full segment is isolated:

```jsonc
// 1. slice the FULL field (prefix + value + marker) off the previous remainder
{ "binding_type": "view", "source_property_name": "('%.{FULL}s' * #rem_after_{PREV})", "target_property_name": "#raw_{FIELD}" },
// 2. subtract it to make the next remainder
{ "binding_type": "view", "source_property_name": "(#rem_after_{PREV} - #raw_{FIELD})", "target_property_name": "#rem_after_{FIELD}" },
// 3. drop the marker ({FULL} - 1), then the prefix and the ';' padding
{ "binding_type": "view", "source_property_name": "(('%.{FULL-1}s' * #raw_{FIELD}) - ('%.2s' * #raw_{FIELD}) - ';')", "target_property_name": "#{FIELD}" }
```

`{PREV}` is the previous field's name — `header` for the first. A reserved block needs no bindings
at all: subtract its byte count from the remainder and move on.

**The label group** (`[1024]` for a `Text` cell) is decoded sequentially by
`core_ui_components.label` from one start offset — consumers pass where the group starts, never
per-field offsets: `labelFontType` (83) · `fontScaleFactor` (83) · `labelX` (83) · `labelY` (83) ·
`text` (tail). `labelFontType` is vestigial, since the cell label sources the common `[606]` slot
now, but it stays so every later offset is unchanged.

**The form title** carries screen-level metadata rather than a control block: a fixed `'scrolls'`
string at `[0-82]`, then scroll `i`'s block at `[83 + i×498]` (`axis` + `x`, `y`, `width`,
`height`, `extent`). Index 0 is the implicit root scroll; a pooled scroll past the emitted list
decodes an empty axis and hides itself. A `<Background>` texture is one string field at the fixed
`BACKGROUND_TITLE_SKIP` = `83 + 5×498` = **2573**, the same offset on both backends. `server_form`
gates on `$protocol_header`, so a form whose title lacks `bcuiv0008` is left untouched.

**Extending it:** append new component fields at the end; carve new *common* fields off the front
of `$reserved`, which keeps every component-specific offset stable (that is how `region` and
`fontType` landed); never change `TYPE_WIDTH`, `PAD_CHAR`, the header format or canonical field
order; bump `VERSION` for anything a shipped decoder would misread.

## Documentation

- [ui-runtime](https://bedrock-core.drav.dev/docs/ui/ui-runtime) — [components](https://bedrock-core.drav.dev/docs/ui/ui-runtime/components), [hooks](https://bedrock-core.drav.dev/docs/ui/ui-runtime/hooks), [API](https://bedrock-core.drav.dev/docs/ui/ui-runtime/api)
- [Render pack](https://bedrock-core.drav.dev/docs/ui/ui-runtime/render-pack) — protocol versions, the control block, upgrading
- [Custom native components](https://bedrock-core.drav.dev/docs/ui/ui-runtime/api/custom-native-components) — writers, routers, and the performance rules that come with them
- [Bedrock Wiki — JSON UI](https://wiki.bedrock.dev/json-ui/json-ui-intro) and [string operations](https://wiki.bedrock.dev/json-ui/string-to-number)

## License

MIT
