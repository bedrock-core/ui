# @bedrock-core/ui-runtime

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.
>
> This is not ready for production use.

Core framework library for `@bedrock-core/ui`. This package contains the JSX runtime, serialization protocol, component system, and rendering logic that powers `@bedrock-core/ui`.

## 📦 Installation

This package is typically installed as a dependency when using `@bedrock-core/ui`:

```bash
yarn add @bedrock-core/ui
```

Or directly:

```bash
yarn add @bedrock-core/ui-runtime
```

## 🧱 Architecture Overview

| Layer | Responsibility | Key Files |
|-------|----------------|-----------|
| JSX Runtime | Transforms JSX to `{ type, props }` elements | `src/jsx/jsx-runtime.ts` |
| Component Functions | Pure functions returning `JSX.Element` objects | `src/components/*.ts` |
| Serialization Protocol | UTF‑8 fixed-width, semicolon-padded segments | `src/core/serializer.ts` |
| Runtime (Entry) | Orchestrates build → snapshot → show → response; owns effect loop | `src/core/render/lifecycle.ts` |
| Layout Phase | Runs the flex engine over the built tree, tags scroll regions | `src/core/render/phases/layout.ts` |
| Presenters | Serialize the laid-out tree into an ActionForm / ModalForm snapshot | `src/core/render/presenters/*.ts` |
| Fiber Registry | Manages component instances and hook state | `src/core/fabric/registry.ts`, `src/core/fabric/fiber.ts` |
| Context System | React-like context providers and consumers | `src/core/fabric/context.ts` |
| Hooks System | State management and side effects | `src/hooks/*.ts` |
| Translation Bridge | Per-player resolver used for text metrics and key detection | `src/data/Translation.ts` |

### 🔄 Component Routing System

The system routes components through the native form factory's typed slots — the
engine itself dispatches each entry to the matching RP control, which is the cheapest
routing available (no per-entry `#type` gating for the slot decision):

**For Client-Only Components** (`Panel`, `Text`, `Image`, `Fragment`):

1. `Panel`/`Text` serialize via `form.label()` → `label_router`; `Image` serializes via
   `form.header()` → the slim `header_router` (engine-level type routing; on the modal
   backend images fall back to the label slot)
2. `label_router` decodes the cell's scroll-region field once, then mounts **one merged
   `label_cell`**: a single control-block decode plus small self-gating leaves — a
   background image (the common `[440]` field, which also serves `panel` cells and folded
   `Panel`+`Text` pairs) and per-type `[1,1]` label frames gated on `#type`
3. **Serializer cell elision**: a background-less `<Panel>` emits nothing (its children
   are independent absolutely-positioned cells), and a `Panel(background)` wrapping a
   single `<Text>` folds into one text cell — both cut the engine's per-cell
   instantiation cost, the dominant cost on large screens
4. Decode bindings carry `binding_condition`: gate chains are `once` (the payload is
   constant per screen instance) and everything downstream is `visible`, so a
   non-matching leaf costs only its ~7-binding gate and nothing re-evaluates per frame

**For Native Form Components** (`Form` and its `Form.*` fields — shipped in 0.9):

- A `<Form>` on the tree switches the renderer from the all-buttons ActionForm backend to a native `ModalFormData` build (one atomic submit)
- Field controls (`Form.Toggle`, `Form.Slider`, `Form.Dropdown`, `Form.InlineSelect`, `Form.Input`) map to the native modal control factory (`toggle` / `slider` / `dropdown` / `input`) instead of the label router
- They still use the same serialization protocol, so the RP decoders share the field-slicing machinery; values arrive once, on submit, keyed by each control's `name`
- `Form.Button` is NOT a native control — it consumes no `formValues` slot; its geometry + styling ride the form **title** payload (assembled post-layout) and wire to the engine's submit / close button ids

This "label-as-entry-point" system allows unlimited custom client components, while the modal backend leverages Minecraft's native form factory for interactive fields.

### ⚡ Performance Principles

JSON UI cost is dominated by **how many controls the engine instantiates** and how many
bindings it evaluates at screen creation — not by payload string length (measured: +10KB
per element made no difference) and not by re-evaluation once conditions are set. The
architecture therefore follows these rules (established with in-game measurements):

1. **Fewer cells beats everything.** Every emitted form entry instantiates a router
   subtree in *every* mounted scroll-pool slot. The serializer skips no-op cells
   (background-less panels) and folds `Panel`+`Text` pairs before anything reaches the
   engine.
2. **One decode per cell.** The merged `label_cell` runs the control-block decode once;
   type-specific visuals are cheap self-gating leaves, not sibling full-decode variants.
3. **`binding_condition` on everything.** Gate chains (`#type`, region) are `once` —
   the payload is constant for the lifetime of a screen instance. All other decode
   chains are `visible`, so gated-off leaves skip their work. Only genuinely live
   channels (toggle state, dropdown open state/selection, typed text) stay unconditioned.
   Never condition a binding that a hidden control needs to compute its own visibility.
4. **Instantiation is parse-time.** `visible: false` does NOT prevent instantiation and
   `#collection_length` can NOT be view-computed (both probe-verified) — the only real
   levers are emitting fewer entries and mounting fewer pool slots. That is why the
   scroll pool is capped at **2** pooled scrolls (`MAX_POOLED_SCROLLS`); growing it means
   re-adding the RP slot + router variants and accepting the per-slot cost.

## 🧩 Component Pattern

Components are pure functions that return `JSX.Element` objects (using the custom JSX runtime):

```tsx
import { withControl, type ControlProps, type FunctionComponent, type JSX } from '@bedrock-core/ui';

export interface PanelProps extends ControlProps {
  // Component-specific props go here
}

export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),  // Must be first - applies control props in canonical order
    // Component-specific props with defaults go here after withControl
    children,              // Children always last
  },
});
```

**Conventions:**

- Dimension and position props use flexbox style values (texels or percent strings like `"50%"`); the layout engine resolves these to absolute Pocket-space texels before serialization
- **Props order is critical**: `withControl(rest)` must always be first in the props object, followed by component-specific props with default values, then `children` last
- Component prop names are camelCase; JSON UI bindings use snake_case
- Use the custom JSX runtime - no need to import React
- **All "optional" props must have defined defaults** - no undefined/null values in serialized output
- The `serialize()` function in `core/serializer.ts` handles the encoding automatically
- The `withControl()` helper applies standard control properties in canonical order

## 🔐 Serialization Protocol

Defined in `src/core/serializer.ts`.

Payload always starts with a 9-character header: `bcui` + `vXXXX` — currently **`bcuiv0008`** (`VERSION = 'v0008'`). Decoders must skip these first 9 chars before field slicing.

Each field is composed of three conceptual parts concatenated in this order:

1. Type prefix (2 bytes)
2. Value (padded with semicolons `;` until defined byte length)
3. Unique 1‑byte field marker (disambiguates otherwise identical full regions during JSON UI subtraction)

The one exception is the **variable-length tail** (v0008): the final field of a terminal payload
may be emitted raw — no prefix, no padding, no marker, no length cap — because everything before
it decodes at fixed offsets and the tail is simply "the rest". Only `Text` uses it today, for its
text channel.

### Field Widths (bytes)

| Type     | Prefix | Prefix Width | Type Width | Marker Width | Full Width | Notes |
|----------|--------|--------------|------------|--------------|------------|-------|
| String   | `s:`   | 2            | 80         | 1            | 83         | Hard 80-byte cap — over that, `serializeProps()` throws. Use a translation key (or a `RawMessage`) for anything longer |
| Number   | `n:`   | 2            | 80         | 1            | 83         | Expanded to match string width in v0003; unified field sizing since v0004 |
| Boolean  | `b:`   | 2            | 5          | 1            | 8          | Serialized as `'true'` or `'false'` |
| Reserved | `r:`   | 0            | variable   | 0            | variable   | No prefix/marker for easier JSON UI skipping |
| Tail     | —      | 0            | variable   | 0            | variable   | Last field only, uncapped. A `RawMessage` tail turns the payload into `{ rawtext: [{ text: <fixed fields> }, <tail>] }`, resolved by the **client** |

### Markers

Markers come from a stable ordered alphabet (`0-9A-Za-z-_`), limiting components to 64 props max.
Index position = field order. Never reorder existing markers (backward decode offsets rely on stable sequence).

### Encoding Example

`serializeProps()` is internal to `src/core/serializer.ts` (the public entry point is `render()`),
but it is the clearest way to read the wire format:

```ts
import { serializeProps } from '../core/serializer';

const [encoded, bytes] = serializeProps({
  type: 'example',      // string → 83 bytes
  message: 'hello',     // string → 83 bytes
  count: 123,           // number → 83 bytes
  ratio: 45.67,         // number → 83 bytes
  ok: true,             // bool → 8 bytes
});
// Total: 83 + 83 + 83 + 83 + 8 = 340 bytes (plus 9-byte header = 349 bytes)
```

### Field Binding Template Pattern (Decoding)

Decoding inside the resource pack uses a progressive "slice → subtract" strategy. Each field follows a 3‑step lifecycle:

`extract_raw → update_remainder → extract_value`

Generic template (JSON UI binding entries) — copy & replace placeholders:

```jsonc
{
    "binding_type": "view", // full_width
    "source_property_name": "('%.{FULL_WIDTH}s' * #rem_after_{PREV})",
    "target_property_name": "#raw_{FIELD_NAME}"
},
{
    "binding_type": "view",
    "source_property_name": "(#rem_after_{PREV} - #raw_{FIELD_NAME})",
    "target_property_name": "#rem_after_{FIELD_NAME}"
},
{
    "binding_type": "view", // (full_width - marker_width) - prefix_width - padding_char (;)
    "source_property_name": "(('%.{FM_WIDTH}s' * #raw_{FIELD_NAME}) - ('%.2s' * #raw_{FIELD_NAME}) - ';')",
    "target_property_name": "#{FIELD_NAME}"
}
```

**Placeholder reference:**

- `{FIELD_NAME}` - unique identifier (e.g. `type`, `visible`)
- `{PREV}` - previous remainder token (first field uses `header`, others use previous field name)
- `{FULL_WIDTH}` - from table full_width column
- `{FM_WIDTH}` - table (full_width - marker_width)

**For reserved blocks:** Simply skip by subtracting the fixed byte count from remainder, no extraction needed.

### Base Control Properties Deserialization Order

Every component inherits the same **1024-byte control block**, applied by `withControl()`
(`src/components/control.ts` — the authoritative byte map lives in its doc comment) and
deserialized in this exact order after the 9-byte protocol header (`bcuiv0008`):

```text
[0-8]     header                        - 9 bytes, 'bcuiv0008'
[9-91]    Field 0: type      (string)   - component type identifier
[92-174]  Field 1: width     (number)   - computed width from layout
[175-257] Field 2: height    (number)   - computed height from layout
[258-340] Field 3: x         (number)   - computed x position from layout
[341-423] Field 4: y         (number)   - computed y position from layout
[424-431] Field 5: visible   (bool)     - visibility state (default: true)
[432-439] Field 6: enabled   (bool)     - interaction enabled (default: true)
[440-522] Field 7: background(string)   - background texture path ('' = none)
[523-605] Field 8: region    (number)   - scroll index this element belongs to
[606-688] Field 9: fontType  (string)   - the cell's font alias (default: 'default')
[689-1023] $reserved (335 bytes)        - reserved for future expansion

Total control block: 1024 bytes (9 header + 8×83 + 2×8 + 335 reserved)
```

**Component-specific properties** are appended after the reserved block, so the first one always
starts at **[1024]** (e.g. a button's `backgroundHover`).

Both `region` (added in v0006) and `fontType` (added in v0008) were **carved out of the reserved
block** — 501 → 418 → 335 bytes — precisely so that the absolute offset of every
component-specific field stayed unchanged across those revisions.

#### Why `fontType` is a common field

The RP mounts **one merged `label_cell`** for every emitted cell — `core_ui_components.label_cell`
gates on `#pre_visible` alone — so its label decodes a font slot no matter what the cell actually
is. When that slot was read from the component-specific region, an `Image`'s `texture` or a
`Button`'s `backgroundHover` landed in the engine's `#font_type`, which logs
`Could not find font alias <path>` to `NonAssertErrorLog`.

Moving the slot into the common control block fixes it structurally: every component now carries a
*valid* alias at a fixed offset (non-text components default to `'default'`), so the label can
decode it unconditionally and can never see a texture path. `Text` overwrites the value **in
place** — re-assigning an existing key keeps its position in the canonical order, so the value
stays at `[606]` and never drifts into the component-specific region.

#### The label group (`[1024]`, v0008)

Payload-styled labels share one field group, decoded **sequentially** by
`core_ui_components.label` from a single start offset (`$label_skip`) — consumers pass where the
group starts, never per-field offsets. For a `Text` cell the group is the first component-specific
block, so it starts at `[1024]`:

```text
[1024-1106] labelFontType    (string)   - the group's own font slot
[1107-1189] fontScaleFactor  (number)   - scale over the font_size:small 0.5x base
[1190-1272] labelX           (number)   - label X offset inside the cell box
[1273-1355] labelY           (number)   - label Y offset inside the cell box
[1356-…]    text             (tail)     - variable-length, unpadded, unprefixed, uncapped
```

Text is **last** so it can be the payload's variable tail. `labelFontType` is the group's original
font slot; the cell label now sources `[606]` instead, but the slot stays so every later group
offset and every sub-element group that still reads its own slot 1 are unchanged.
See `src/components/Form/controlPayload.ts` (`labelPayloadFields`) for the shared writer.

### Title Metadata (Scroll Viewports)

Two distinct payloads share the protocol. Each **form entry label** carries a component's control
block (above), while the **form title** (`#title_text`) carries screen-level metadata: a flat list
of scroll viewports, plus an optional full-screen backdrop.

Produced by `serializeScrollMetadata(scrolls, background?)` (ActionForm backend) and
`serializeModalTitle(scrolls, extraFields, background?)` (modal backend).

| Offset (after header) | Type   | Bytes | Purpose |
|-----------------------|--------|-------|---------|
| `[0-82]`              | string | 83    | fixed `'scrolls'` marker (field 0) — pins every block below to a predictable offset |
| `[83 + i×498]`        | ×6     | 498   | scroll `i`'s block: `axis` (string) + `x`, `y`, `width`, `height`, `extent` (numbers) |

Index 0 is always the implicit root scroll. A pooled scroll whose index is beyond the emitted list
decodes an empty axis and hides itself, so no explicit count field is needed. Geometry is consumed
RP-side via `use_anchored_offset` (viewport position) and `#size_binding_*` (viewport size); the
content panel uses the `[1,1]` size_anchor trick to overflow only the scroll axis by `extent`.

A non-empty `<Background>` texture is appended as ONE string field at the fixed offset
`BACKGROUND_TITLE_SKIP` = `83 + 5×498` = **2573** bytes after the header, padding the gap with
reserved `;` bytes. Both backends target the same offset so the single static
`core_ui_common.form_background` serves both; when there is no background nothing is emitted at
all. The modal title additionally carries the `Form.Button` submit/exit blocks (763 bytes each,
see `src/components/Form/FormButton.ts` for that byte contract) between the scroll block and the
background field.

No protocol guard is needed inside the containers: `server_form.json` gates on its own
`$protocol_header` (`bcuiv0008`) and collapses the screen to `0px` for any form whose title does
not carry that header — so a foreign server form is left completely untouched.

### Decoding Rules & Tips

- Always slice FULL field (value + prefix + marker) first, then subtract to create the remainder
- Strip padding only after isolating the core full segment (second slice) so you don't accidentally remove semicolons in later fields
- Never assume a marker character appears only once globally—its uniqueness is only relative to its position
- Protocol extension rule: append new fields (new markers) at the end; never reorder or shrink earlier core lengths
- Reserved blocks are skipped entirely in deserialization—they create "gaps" in the payload that the JSON UI decoder jumps over
- New **common** fields are carved from the front of `$reserved` (shrinking it by 83), which keeps every component-specific offset stable; new **component-specific** fields go after the reserved block

## 🌍 Translations

Localized text needs no wiring: the addon's `createI18n(bundle)` call
([`@bedrock-core/i18n`](https://github.com/bedrock-core/ui/blob/main/packages/i18n/README.md))
registers itself as the default translation source, and `render()` populates a
`TranslationContext` at every root with that instance's resolver, bound to the viewing player and
re-derived on each build pass.

- **`TranslationContext`** – Context to *override* the default source for a subtree. Hosts that
  resolve beyond their own bundle provide `core.translations.forPlayer(player)` here.
- **`useTranslation()`** – Read the current `TranslationResolver` value from context.
- **`useTranslationResolver()`** – The resolver actually in effect (context override, else the
  registered default). This is what `Text` uses internally.
- **`TranslationResolver`** – `(realKey: string) => string | undefined`, re-exported from
  `@bedrock-core/i18n`.

Server-side resolution here feeds **layout metrics and key detection only** — what the client
paints is always its own resolution attempt, because every text tail goes through a
`localize: true` label.

## 🪝 Hooks System

Hooks follow React-like patterns but adapted for Minecraft server environment:

- **`useState(initial)`** – State hook with setter function
- **`useEffect(fn, deps)`** – Effect hook with dependency array
- **`useRef(initial)`** – Mutable ref container
- **`useContext(context)`** – Access context value from Provider
- **`useReducer(reducer, initial)`** – Reducer hook for complex state
- **`usePlayer()`** – Current player from render context
- **`useEvent(eventKey)`** – Listen to global events
- **`useExit()`** – Cleanup callback when form closes

**Rules:**

- Hooks must be called in consistent order (no conditional hook calls)
- Hooks are stored per-component-instance in FiberRegistry
- `useEffect` cleanup functions run on instance deletion

## 🧪 Testing

This package uses Vitest with mocked Minecraft APIs:

```bash
yarn test              # Run tests
yarn coverage          # Generate coverage report
```

Mocks are located in `src/__mocks__/@minecraft/`.

## ⚠️ Known Caveats

- JSON UI string ops with numbers can behave unpredictably; prefix markers before numeric-derived substrings client-side.
- **Texel values & JSON UI:** Dimension and position values are serialized as raw integer texels (Pocket-space). JSON UI ignores numbers with decimal points, so the layout engine rounds all values to integers before serialization.
- Subtraction operator (`-`) removes all occurrences; use distinct prefixes to avoid collisions.


## ⚠️ Breaking Change Guards

- **Never** modify `TYPE_WIDTH`, `PAD_CHAR`, or canonical field order
- **Never** change the 9-char header format (`bcui` + version)
- **Always** append new fields to end; claim future space from the `$reserved` block in `withControl()` (there is no standalone `reserveBytes()` helper)
- **Always** increment `VERSION` when making protocol-breaking changes (with migration docs)
- **Test rigorously** – serialization format is frozen once clients decode it

## 📖 Reference Documentation

For JSON UI decoding implementation details:

- [Bedrock Wiki - JSON UI Introduction](https://wiki.bedrock.dev/json-ui/json-ui-intro)
- [JSON UI String Operations](https://wiki.bedrock.dev/json-ui/json-ui-intro#using-operators)
- [String Formatting & Number Conversion](https://wiki.bedrock.dev/json-ui/string-to-number)
- [JSON UI Documentation](https://wiki.bedrock.dev/json-ui/json-ui-documentation)
