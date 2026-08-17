# @bedrock-core/ui – AI Coding Instructions

Essential knowledge for AI agents working on this Minecraft Bedrock UI serialization library. Follow established patterns; don't invent new formats.

## Monorepo Structure

This is a **monorepo with nine independent packages** (using Yarn workspaces). The root
`@bedrock-core/ui` package is a thin facade: `src/*.ts` re-export the packages behind subpath
exports (`.`, `./navigation`, `./ore-styled`, `./guides`, `./config`, `./flexbox`, `./i18n`).

- **`packages/ui-runtime`** – Core framework library (`@bedrock-core/ui-runtime`)
  - Pure TypeScript serialization, components, hooks, and rendering logic
  - Published as ESM module for consumption by addons
  - Entry: `src/index.ts` → `dist/index.js` after build
  - Tests: Vitest with mocked `@minecraft/server` and `@minecraft/server-ui`
  - No dependencies on Minecraft APIs (mocked for testing)

- **`packages/resource-pack`** – Test addon and reference implementation
  - Complete Minecraft addon (Behavior Pack + Resource Pack)
  - Uses the framework via `@bedrock-core/ui` imports
  - JSON UI decoders (Resource Pack) that deserialize protocol data
  - Built with Regolith for TypeScript bundling
  - Demonstrates complete integration from framework → addon

- **`packages/cli`** – Project scaffolding tool (`@bedrock-core/cli`)
  - CLI to generate pre-configured addon projects with the framework
  - Template system with variable replacement ({{PROJECT_NAME}}, etc.)
  - Downloads the render pack automatically during generation
  - Entry: `src/index.ts` → `dist/index.js` (executable via `npx @bedrock-core/cli`)

- **`packages/navigation`** – Stack navigation system (`@bedrock-core/navigation`)
  - Single-root-render stack navigator inspired by React Navigation
  - Exports: `NavigationContainer`, `createStackNavigator`, `useNavigation`, `useRoute`
  - All screen transitions happen via navigation actions, not new `render()` calls

- **`packages/flexbox`** – Flexbox layout engine (`@bedrock-core/flexbox`)
  - Pure TypeScript Yoga-style layout algorithm for computing component positions
  - Exports: `createNode()`, `computeLayout()`, `CANONICAL_SCREEN`, flex/alignment utilities
  - Used internally by ui-runtime; also available standalone for custom layout logic

- **`packages/ore-styled`** – Ore-UI styled component library (`@bedrock-core/ore-styled`)
  - Pre-built compound components matching Minecraft's Ore-UI visual language
  - Exports: `Button`, `Card`, `Checkbox`, `RadioGroup`/`Radio`, `Toggle`, `ToggleButtonGroup`/`ToggleButtonItem`, `Divider`, `Header`, `MenuRow`, `Input`, `Dropdown`, `Slider`, `Form` (styled modal fields), `ItemSlot`, `ItemContainer`, `EquipmentSlots`, `theme`
  - Renders through the same `@bedrock-core/ui` render pack — no separate pack

- **`packages/i18n`** – Localization engine (`@bedrock-core/i18n`)
  - Typed keys, `{{var}}` interpolation, CLDR plural categories; zero runtime dependencies
  - Three verbs: `key()` (client-resolved key), `raw()` (client-resolved `RawMessage`), `t()` (server-resolved string), plus `forPlayer` / `forLocale` binders
  - Exports: `createI18n`, `createResourceBundle`, `resolveDisplay`, `realKeyFor`, `pickLocale`, `pluralCategory`, `interpolate`/`templateVars`/`toPositional`, `type DisplayText`
  - Build half is the `i18n` Regolith filter (replaced the removed `translation-keys` filter)

- **`packages/guides`** – MDX in-game guides (`@bedrock-core/guides`)
  - `createGuide(manifest)` renders a compiled guide IR as a self-contained screen
  - Exports: `createGuide`, `GuideBlockList`, `isGuideManifest`, plus the IR types

- **`packages/config`** – Shared addon list + config + guide UI (`@bedrock-core/config`)
  - `ui(core)` mounts `<ns>:config` / `:configat` / `:guide` / `:list` under the addon's namespace
  - Exports: `ui`, `App`, `registerAddonCommands`, `allowedScopes`/`clampTarget`/`isOperator`, `CONFIG_SCOPES`

## Research Guidelines

**For Minecraft add-on or development questions:** Consult authoritative sources:

1. **Microsoft Learn Minecraft Creator Documentation** (https://learn.microsoft.com/en-us/minecraft/creator/)
   - Official API contracts, scripting guides, best practices for Bedrock development
   - Use Microsoft Docs MCP to search

2. **Bedrock-OSS/bedrock-wiki** (https://github.com/Bedrock-OSS/bedrock-wiki)
   - Community-maintained wiki with practical examples, workarounds, implementation patterns
   - Use GitHub MCP to search

**Strategy:** Query both simultaneously. Microsoft Learn provides authoritative specs; wiki provides practical patterns. If information conflicts, prefer Microsoft Learn for API contracts and wiki for implementation techniques.

## Core Architecture

**The Big Picture:**
JSX element tree → serialize to compact fixed-width fields → inject into form label → JSON UI decodes by byte offset → rich UI rendering

**Critical Flow:**
```
JSX Component Tree (TypeScript)
    ↓
Fiber System (manages component instances & hooks state)
    ↓
buildTree(element, player) → two-phase tree building
    ↓
computeLayout() → flex pass writes absolute texels + scroll regions
    ↓
serialize(element, form) → encodes each field with fixed widths
    ↓
present(player, tree) → ActionFormData, or ModalFormData when a <Form> is on the tree
    ↓
form.label() / .header() / .button() → injected payload; form.title() → screen metadata
    ↓
JSON UI (Resource Pack) → decodes by fixed byte slicing
    ↓
Screen renders with conditional bindings
```

### Two-Phase Rendering Architecture

**Phase 1 - Rendering Phase** (`buildTree()`):
- Expands function components and resolves contexts
- Creates fiber instances for ALL components in tree
- Initializes hooks (useState, useEffect, etc.)
- Applies parent-child inheritance (visibility, positioning)
- Returns fully processed JSX element tree

**Phase 2 - Logic Phase** (background):
- Effects run while form is displayed to user
- State changes trigger `scheduleLogicPass()` → background rebuild
- Interactive transactions suppress background passes during callbacks
- Cleanup on form dismissal or programmatic close

**Key Pattern:**
```ts
render(root, player) → buildTree() → computeLayout() → present() → [user sees form] → effects run → state changes → scheduleLogicPass() → rebuild
```

### JSX & Component Runtime

- **JSX Runtime** (`src/jsx/jsx-runtime.ts`): Transforms JSX syntax to `JSX.Element` objects
  - Format: `{ type: string | FunctionComponent, props: { ... } }`
  - Three factories: `jsx`, `jsxs`, `jsxDEV` (all aliases to `renderJSX()`)
  - Fragment: `<>...</>` syntax supported via `Fragment` export
  - Runtime does NOT call function components – that happens during tree building

- **Component Functions** (`src/components/*.ts`): Pure functions returning `JSX.Element`
  - Components are `FunctionComponent<T>` with signature: `(props: T): JSX.Element`
  - Must use `withControl(rest)` to apply standard control props
  - Children passed via props, not rest parameters
  - Pattern: `export const Panel = ({ children, ...rest }): JSX.Element => ({ type: 'panel', props: { ...withControl(rest), children } })`
  - Available components: `Panel`, `Text`, `Image`, `Button`, `Fragment`, `Background`, `Scroll`, `ItemRenderer`, the modal-backed primitives `Input` / `Dropdown` / `Slider`, and `Form` with `Form.Toggle` / `.Slider` / `.Dropdown` / `.InlineSelect` / `.Option` / `.Input` / `.Button`
  - `ItemRenderer` requires `ItemAuxContext` (experimental — reliable only in single-addon worlds)
  - `Text` children are `DisplayText`: a literal string, a translation key, or a `RawMessage` — auto-detected, no prop to declare

- **Fiber System** (`src/core/fabric/`): Manages component instances and hook state
  - **Registry** (`registry.ts`): Global Map<string, Fiber> tracking all instances
  - **Fiber** (`fiber.ts`): Per-component instance with hookStates, parent/child/sibling links
  - **Dispatcher** (`dispatcher.ts`): MountDispatcher vs UpdateDispatcher for hook behavior
  - **Context** (`context.ts`): Provider/Consumer pattern with contextSnapshot per fiber
  - One fiber instance per unique component ID per player
  - Tracks hooks, mount state, dirty flag (`shouldRender`) for re-renders
  - Used during `activateFiber()` to execute hooks in component's dynamic scope

### Serialization Protocol (Never Break This)

**Payload Structure:**
```
bcuiv0008 + [type field] + [control fields] + [reserved] + [component-specific fields] + [tail?]
 └─ 9 chars (header)
```

**Field Encoding:** `[prefix][padded_value][marker]`

- **Prefix:** `s:`, `n:`, `b:`, `r:` (string, number, bool, reserved)
- **Padding:** Fill to fixed width with `;` (UTF-8 safe truncation boundary)
- **Marker:** Unique 1-char from `0-9A-Za-z-_` (prevents JSON UI subtraction conflicts)

**Critical Fixed Widths** (in `serializer.ts`):
```
String:   83 bytes total (s: + 80 content + 1 marker)
Number:   83 bytes total (n: + 80 content + 1 marker)  [v0003+: expanded to match strings]
Bool:      8 bytes total (b: + 5 content + 1 marker)
Reserved:  Variable (no prefix/marker for easier JSON UI skipping)
Tail:      Variable, LAST field only (v0008) — no prefix, no padding, no marker, no cap
```

The tail is how `Text` carries its text channel. A `RawMessage` tail makes `serializeProps()`
return `{ rawtext: [{ text: <fixed fields> }, <tail>] }` so the **client** resolves it.

**Constants (never change):**
```ts
const PROTOCOL_HEADER = 'bcuiv0008';    // 9 chars
const PAD_CHAR = ';';                  // Only padding char
const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const VERSION = 'v0008';               // Only update with migrations
```

**Byte Allocation Map (1024-byte control block)** — authoritative source is the doc comment above
`withControl()` in `src/components/control.ts`:
- [0-8]: Protocol header (9 bytes: "bcuiv0008")
- [9-91]: Type field (string, 83 bytes)
- [92-174]: Width (number, 83 bytes)
- [175-257]: Height (number, 83 bytes)
- [258-340]: X position (number, 83 bytes)
- [341-423]: Y position (number, 83 bytes)
- [424-431]: Visible (bool, 8 bytes)
- [432-439]: Enabled (bool, 8 bytes)
- [440-522]: Background (string, 83 bytes)
- [523-605]: Region (number, 83 bytes) — the scroll index this element belongs to
- [606-688]: FontType (string, 83 bytes) — the cell's font alias, COMMON to every type
- [689-1023]: Reserved for future (335 bytes)
- [1024+]: Component-specific data per type

`region` (v0006) and `fontType` (v0008) were carved out of the reserved block (501 → 418 → 335)
so every component-specific offset stayed put.

**Why `fontType` is common, not Text-only:** the merged `label_cell` mounts for every cell type
(it gates on `#pre_visible` alone), so its label decodes a font slot regardless. Read from the
component-specific region, an image's `texture` or a button's `backgroundHover` landed in the
engine's `#font_type` and logged `Could not find font alias <path>` to `NonAssertErrorLog` — a
Marketplace submission blocker. Every component now carries a valid alias at a fixed offset
(non-text defaults to `'default'`); `Text` overwrites it **in place** so it never drifts.

**Label group** (v0008, sequential from `$label_skip`; `[1024]` for a `Text` cell):
`labelFontType` → `fontScaleFactor` → `labelX` [1190] → `labelY` [1273] → `text` (tail).
Shared writer: `src/components/Form/controlPayload.ts` (`labelPayloadFields`).

### Title Metadata (Scroll Viewports)

The protocol carries **two distinct payloads**: each form-entry *label* holds a component's control block (above), while the form *title* (`#title_text`) holds screen-level metadata — a flat list of scroll viewports plus an optional backdrop. Produced by `serializeScrollMetadata(scrolls, background?)` (ActionForm) and `serializeModalTitle(scrolls, extraFields, background?)` (modal), both in `serializer.ts`.

```
bcuiv0008 + [ 'scrolls': string, 83 bytes ] + per scroll i, 498 bytes:
 └─ 9 chars (header)   └─ fixed field-0 marker    [ axis(s) x(n) y(n) width(n) height(n) extent(n) ]
```

- **Index 0 is always the implicit root scroll.** A pooled scroll whose index is past the emitted list decodes an empty axis and hides itself, so there is no count field.
- Geometry is consumed RP-side via `use_anchored_offset` (viewport position) and `#size_binding_*` (viewport size); the content panel uses the `[1,1]` size_anchor trick to overflow only the scroll axis by `extent`.
- A `<Background>` texture is ONE string field at the fixed `BACKGROUND_TITLE_SKIP` = `83 + 5×498` = **2573** bytes after the header, with the gap padded by reserved `;` bytes. Both backends target that offset so a single static `core_ui_common.form_background` serves both. Omitted entirely when empty.
- The modal title additionally carries the two `Form.Button` blocks (submit at `[590]` abs, exit at `[1353]` abs, 763 bytes each — see `src/components/Form/FormButton.ts`) between the scroll block and the background field.
- No bcui guard is needed inside the containers; `server_form.json` gates on `$protocol_header` (`bcuiv0008`) and collapses to `0px` for foreign forms.
- `MAX_SCROLLS` (4) is what the title format can carry; `MAX_POOLED_SCROLLS` (2) is what the RP actually mounts, and the layout pass throws a `ScrollLimitError` past it.

> **Field numbering note:** The title payload's field indices are **separate from the component control block's** (field 0 = type at byte 9, field 1 = width at byte 92, etc.). These are two completely different payloads with independent byte layouts. Do not conflate them.

### withControl() Function

**Location:** `src/components/control.ts`

Enforces canonical field ordering and applies defaults to all components. Key points:

- Returns props in **exact canonical order** (critical for serialization)
- Order: width, height, x, y, visible, enabled, background, region, fontType, $reserved
- Applies defaults to optional props (visible=true, enabled=true, background='', region=0, fontType='default')
- Reserves 335 bytes for future expansion (total 1024 bytes control block)
- All "optional" props must have defined defaults – no undefined/null values
- Layout props (`width`, `flexGrow`, `padding`, `position`, `aspectRatio`, …) are stashed under `__layout` — the `__` prefix excludes them from serialization; the flex engine consumes them and writes back `jsonUIx/y/Width/Height`
- Because layout props are not serialized, sizes accept texels **or** percent strings (`"50%"`); the layout phase resolves them to integer texels before serialization
- Re-assigning an existing key (e.g. `Text` setting `fontType`) overwrites **in place** and keeps the canonical position — that is how `fontType` stays at `[606]`

```ts
// Usage in component:
export const Panel = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),  // Applies defaults + canonical order
    children,
  },
});
```

### Component Routing System

**For Client-Only Components** (`Panel`, `Text`, `Image`, `Fragment`):

1. The native form factory's typed slots do the dispatch — `Panel`/`Text` go through `form.label()` → `core_ui_common.label_router`; `Image` through `form.header()` → the slim `header_router`; `Button` through `form.button()` → `button_router`
2. `label_router` decodes the cell's region field once, then mounts **one merged `label_cell`**: a single control-block decode plus small self-gating leaves (a background image from the common `[440]` field, per-type `[1,1]` label frames gated on `#type`)
3. **Serializer cell elision** (`serialize()`): a background-less `<Panel>` emits nothing, and `Panel(background)` wrapping a single `<Text>` folds into one text cell
4. Decode bindings carry `binding_condition`: gate chains are `once`, everything downstream is `visible`

**For Native Form Components** (`Form` and its `Form.*` fields — shipped):
- A `<Form>` on the tree switches the renderer to a native `ModalFormData` build (one atomic submit)
- Fields map to the native modal control factory (`toggle` / `slider` / `dropdown` / `input`) instead of the label router; values arrive once, on submit, keyed by each control's `name`
- `Form.Button` is NOT a native control — it consumes no `formValues` slot; its geometry + styling ride the form **title** payload

### Component Pattern (Follow Exactly)

```ts
import type { Writer } from '../core/types';
import { emitLabel } from '../core/writers';
import { ControlProps, withControl } from './control';
import { FunctionComponent, JSX } from '../jsx';

export interface PanelProps extends ControlProps {
  children?: JSX.Node;
  cornerTexture?: string;  // Component-specific prop
}

export const Panel: FunctionComponent<PanelProps> = ({ cornerTexture, children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),                        // MUST come first
    cornerTexture: cornerTexture ?? '',          // Explicit default — never undefined
    children,                                    // Children always last
  },
});

/** Every native type needs a writer, registered in `registerNativeComponents()`. */
export const panelWriter: Writer = (payload, form, ctx) => {
  emitLabel(payload, form, ctx);
};
```

**Rules:**

1. Props are camelCase; JSON UI keys are snake_case
2. Use `withControl(rest)` to apply/order standard control props
3. All optional props must have **defined defaults** (no undefined/null)
4. Field order after `withControl()`: component-specific props, then `children`
5. Components extend `ControlProps` (which extends `LayoutProps`: width, height, flex, padding, margin, position, visible, enabled, background)
6. Dimension props accept texels (`number`) or percent strings (`"50%"`)

## Key Files & Responsibilities

### UI-Runtime Package

- **`src/index.ts`** – Public API exports (all public components, hooks, utilities)
- **`src/core/serializer.ts`** – UTF-8 fixed-width protocol: `serialize()`, `serializeProps()`, protocol constants
- **`src/core/render/lifecycle.ts`** – `render(root, player)` function: presents via `@minecraft/server-ui`, manages input locks, seeds `TranslationContext`
- **`src/core/render/tree.ts`** – `buildTree()`: two-phase tree building (expand components, apply inheritance)
- **`src/core/render/phases/layout.ts`** – flex layout pass + scroll-region propagation
- **`src/core/render/presenters/*.ts`** – `present()` / `presentAction()` / `presentModal()`: serialize the tree, show the form, handle callbacks
- **`src/core/render/session.ts`** – Session management: player roots, background logic passes, interactive transactions
- **`src/core/fabric/fiber.ts`** – Fiber operations: `createFiber()`, `deleteFiber()`, `activateFiber()`
- **`src/core/fabric/registry.ts`** – FiberRegistry: global Map, currentFiber tracking
- **`src/core/fabric/dispatcher.ts`** – MountDispatcher & UpdateDispatcher: hook implementations
- **`src/core/fabric/context.ts`** – `createContext()`, `Context<T>`, Provider implementation
- **`src/core/componentRegistry.ts`** – `registerComponent()` / descriptors: the custom native component API
- **`src/core/writers.ts`** – Form-slot emitters (`emitLabel`, `emitButton`, `emitHeader`, …) used by writers
- **`src/components/*.ts`** – Component functions (Panel, Text, Image, Button, Fragment, Background, Scroll, Input, Dropdown, Slider, ItemRenderer)
- **`src/components/Form/*`** – The modal backend: `Form` + its field members, `controlPayload.ts` (shared label group)
- **`src/components/control.ts`** – `withControl()` function (canonical ordering, defaults, byte map)
- **`src/jsx/jsx-runtime.ts`** – Custom JSX runtime: `jsx`, `jsxs`, `jsxDEV`, `Fragment`
- **`src/jsx/jsx-dev-runtime.ts`** – Development JSX runtime (error checking)
- **`src/hooks/*.ts`** – React-like hooks (useState, useEffect, useRef, useContext, useReducer, etc.)
- **`src/data/Translation.ts`** – `TranslationContext`, `useTranslation`, `useTranslationResolver`
- **`src/util/textMetrics.ts`** – Font metrics used by the layout pass for wrapping/ellipsis

### Resource-Pack (Test Addon)

- **`packs/BP/scripts/main.ts`** – Entry point, opens the demo UI
- **`packs/BP/scripts/UI/App.tsx`** – Navigator + route map for the demo screens
- **`packs/BP/scripts/UI/screens/*.tsx`** – One screen per feature (hooks, flex, scrolls, forms, i18n, …)
- **`packs/BP/scripts/UI/i18n.ts`** – The addon's `createI18n(bundle)` call (also the measurement wiring)
- **`packs/data/i18n/<locale>.ts`** / **`packs/data/guides/<locale>/**.mdx`** – Sources for the `i18n` and `guides` filters
- **`packs/RP/ui/_ui_defs.json`** – Declares which JSON UI files to load
- **`packs/RP/ui/server_form.json`** – Entry screen; gates on `$protocol_header` (`bcuiv0008`)
- **`packs/RP/ui/core-ui/common/control.json`** – Decodes the control block via byte offset bindings
- **`packs/RP/ui/core-ui/common/*_router.json`** – label / button / header / dropdown routers
- **`packs/RP/ui/core-ui/components/*.json`** – Component decoders (text.json holds the merged label cell; there is no panel.json)
- **`packs/RP/ui/core-ui/form_components/*.json`** – Native modal control decoders
- **`config.json`** – Regolith build configuration: `guides` → `i18n` → `bundler`

## Development Workflow

### Building & Testing

```bash
# Root workspace
yarn build              # TypeScript compilation to dist/ (all packages)
yarn test               # Vitest for ui-runtime tests
yarn lint               # ESLint across all packages
yarn coverage           # Vitest coverage

# Individual package
cd packages/ui-runtime
yarn build              # tsc compilation
yarn test               # vitest
```

### Test Structure

- **Location:** `src/**/__tests__/**/*.ts` (discovered by Vitest)
- **Mocks:** `src/__mocks__/@minecraft/server*.ts` (mocked Minecraft APIs)
- **Focus:** Serialization correctness, field ordering, layout/scroll geometry, hook state transitions
- **Assert against the exported constants** (`PROTOCOL_HEADER`, `PROTOCOL_HEADER_LENGTH`, `FULL_WIDTH`, `PAD_CHAR`), never against a hard-coded version string or byte count — that is what keeps tests alive across protocol revisions

**Example test pattern:**
```ts
import { serializeProps, PROTOCOL_HEADER, PROTOCOL_HEADER_LENGTH, FULL_WIDTH } from '../serializer';

test('panel serialization', () => {
  const [payload, bytes] = serializeProps({
    type: 'panel',
    width: 100,
    height: 50,
  });

  // v0008: serializeProps returns `string | RawMessage` — narrow before string asserts.
  if (typeof payload !== 'string') { throw new Error('expected a string payload'); }

  expect(payload.startsWith(`${PROTOCOL_HEADER}s:panel`)).toBe(true);
  expect(bytes).toBe(PROTOCOL_HEADER_LENGTH + FULL_WIDTH.s + 2 * FULL_WIDTH.n);
});
```

### JSON UI Decoding Pattern

Resource Pack slices serialized data by fixed byte offsets using JSON UI bindings:

Each field is a 3-step lifecycle: `extract_raw → update_remainder → extract_value`.

```jsonc
{
  "binding_type": "view",
  "source_property_name": "('%.83s' * #rem_after_header)",  // Slice the FULL 83-byte field
  "target_property_name": "#raw_type"
},
{
  "binding_type": "view",
  "source_property_name": "(#rem_after_header - #raw_type)", // Remainder for the next field
  "target_property_name": "#rem_after_type"
},
{
  "binding_type": "view",
  // (full_width - marker) then drop the 2-char prefix and the ';' padding
  "source_property_name": "(('%.82s' * #raw_type) - ('%.2s' * #raw_type) - ';')",
  "target_property_name": "#type"
}
```

Reserved blocks need no extraction — subtract the fixed byte count from the remainder and move on.

## Breaking Change Guards

- **Never** modify `TYPE_WIDTH`, `PAD_CHAR`, or canonical field order
- **Never** change the 9-char header format (`bcui` + version)
- **Always** append new fields to end; claim future space by extending the `$reserved` field in `withControl()` (the reserved block in `control.ts` is where unallocated bytes are held — there is no standalone `reserveBytes()` function)
- **Always** increment `VERSION` when making protocol-breaking changes (with migration docs)
- **Test rigorously** – serialization format is frozen once clients decode it

## Hooks System

Hooks follow React-like patterns but adapted for Minecraft server environment:

- **`useState(initial)`** – State hook with setter function
- **`useEffect(fn, deps)`** – Effect hook with dependency array
- **`useRef(initial)`** – Mutable ref container
- **`useContext(context)`** – Access context value from Provider
- **`useReducer(reducer, initial)`** – Reducer hook for complex state
- **`usePlayer()`** – Current player from render context
- **`useEvent(eventKey)`** – Listen to global events
- **`useExit()`** – Cleanup callback when form closes
- **`useTranslation()` / `useTranslationResolver()`** (`src/data/Translation.ts`) – The per-player translation resolver; `render()` seeds it from the addon's default i18n instance, `TranslationContext` overrides it for a subtree

There is no `useScreen` / `useSetScreen` and no `Screen` enum — the scroll-vs-fixed screen type was
replaced by the v0007 scroll-component model. `render()` takes exactly `(root, player)`.

**Rules:**
- Hooks must be called in consistent order (no conditional hook calls)
- Hooks are stored per-component-instance in FiberRegistry
- `useEffect` cleanup functions run on instance deletion

## Integration Points

- **Framework imports:** `import { render, Text, Panel } from '@bedrock-core/ui'` (subpaths: `@bedrock-core/ui/ore-styled`, `/navigation`, `/i18n`, `/guides`, `/config`, `/flexbox`)
- **Minecraft APIs:** `@minecraft/server` for events, `@minecraft/server-ui` for forms
- **Build system (addon):** Regolith — `guides` → `i18n` → `bundler` (the removed `translation-keys` filter is superseded by `i18n`)
- **Resource Pack bindings:** JSON UI string manipulation for fixed-width field extraction

## Project-Specific Conventions

- **Workspace linking:** Packages reference each other with `workspace:*` in `package.json`
- **Component registration:** Always update both `_ui_defs.json` (load the file) AND the matching router when adding types
- **Byte management:** Never modify existing byte ranges – append component-specific fields, and carve new COMMON fields from the front of `$reserved`
- **Error messages:** Include `[ComponentName]` prefix in logs for debugging

## Start Exploring

1. **Protocol details:** `packages/ui-runtime/src/core/serializer.ts`
2. **Byte map:** `packages/ui-runtime/src/components/control.ts` (`withControl` doc comment — authoritative)
3. **Working component example:** `packages/ui-runtime/src/components/Panel.ts`
4. **Test patterns:** `packages/ui-runtime/src/core/__tests__/serializer.test.ts`
5. **Addon integration:** `packages/resource-pack/packs/BP/scripts/UI/App.tsx`
6. **JSON UI decoder:** `packages/resource-pack/packs/RP/ui/core-ui/components/text.json`
