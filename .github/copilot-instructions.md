# @bedrock-core/ui – AI Coding Instructions

Essential knowledge for AI agents working on this Minecraft Bedrock UI serialization library. Follow established patterns; don't invent new formats.

## Monorepo Structure

This is a **monorepo with three independent packages** (using Yarn workspaces):

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
  - Downloads companion resource pack automatically during generation
  - Entry: `src/index.ts` → `dist/index.js` (executable via `npx @bedrock-core/cli`)

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
serialize(element, form) → encodes each field with fixed widths
    ↓
present(player, tree) → displays via ActionFormData
    ↓
form.label() → injected payload
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
render(element, player) → buildTree() → present() → [user sees form] → effects run → state changes → scheduleLogicPass() → rebuild
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
bcuiv0002 + [type field] + [control fields] + [reserved] + [component-specific fields]
 └─ 9 chars (header)
```

**Field Encoding:** `[prefix][padded_value][marker]`

- **Prefix:** `s:`, `n:`, `b:`, `r:` (string, number, bool, reserved)
- **Padding:** Fill to fixed width with `;` (UTF-8 safe truncation boundary)
- **Marker:** Unique 1-char from `0-9A-Za-z-_` (prevents JSON UI subtraction conflicts)

**Critical Fixed Widths** (in `serializer.ts`):
```
String:   83 bytes total (s: + 80 content + 1 marker)
Number:   27 bytes total (n: + 24 content + 1 marker)
Bool:      8 bytes total (b: + 5 content + 1 marker)
Reserved:  Variable (no prefix/marker for easier JSON UI skipping)
```

**Constants (never change):**
```ts
const PROTOCOL_HEADER = 'bcuiv0002';    // 9 chars
const PAD_CHAR = ';';                  // Only padding char
const FIELD_MARKERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const VERSION = 'v0002';               // Only update with migrations
```

**Byte Allocation Map (1024-byte control block):**
- [0, 8]: Protocol header (9 bytes)
- [9, 91]: Type field (83 bytes)
- [92, 118]: Width (27 bytes)
- [119, 145]: Height (27 bytes)
- [146, 172]: X position (27 bytes)
- [173, 199]: Y position (27 bytes)
- [200, 207]: Visible (8 bytes)
- [208, 215]: Enabled (8 bytes)
- [216, 242]: Layer (27 bytes)
- [243, 269]: Alpha (27 bytes)
- [270, 277]: InheritMaxSiblingWidth (8 bytes)
- [278, 285]: InheritMaxSiblingHeight (8 bytes)
- [286, 1023]: Reserved for future (738 bytes)
- [1024+]: Component-specific data per type

### withControl() Function

**Location:** `src/components/control.ts`

Enforces canonical field ordering and applies defaults to all components. Key points:

- Returns props in **exact canonical order** (critical for serialization)
- Order: width, height, x, y, visible, enabled, layer, alpha, inheritMaxSiblingWidth, inheritMaxSiblingHeight, $reserved
- Applies defaults to optional props (visible=true, enabled=true, etc.)
- Reserves 739 bytes for future expansion (total 1024 bytes)
- All numeric dimensions accept `number` only (no "100px" or "100%" strings)
- All "optional" props must have defined defaults – no undefined/null values
- `position` prop stored as `__position` (__ prefix excludes from serialization, used for traversal only)

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

1. Serialized payload injected via `form.label()` call
2. Resource Pack's `screen_container.json` factory maps to `@core-ui_common.component_router`
3. Router contains all possible component JSON files
4. Each component's conditional binding `(#type = 'panel') and #visible` determines render
5. Only matching type renders; others invisible

**For Native Form Components** (future):
- Will bypass router, use dedicated factory IDs like `@server_form.custom_toggle`
- Still use same serialization protocol for consistency

### Component Pattern (Follow Exactly)

```ts
import { FunctionComponent, JSX } from '@bedrock-core/ui/jsx-runtime';
import { withControl } from './control';

export interface PanelProps extends ControlProps {
  backgroundColor?: string;  // Component-specific prop
}

export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),      // MUST come first
    backgroundColor: rest.backgroundColor ?? '#000000',  // Explicit default
    children,
  },
});
```

**Rules:**

1. Props are camelCase; JSON UI keys are snake_case
2. Use `withControl(rest)` to apply/order standard control props
3. All optional props must have **defined defaults** (no undefined/null)
4. Field order after `withControl()`: component-specific props, then `children`
5. Components extend `ControlProps` (width, height, x, y, visible, enabled, etc.)
6. Dimension props accept `number` only

## Key Files & Responsibilities

### UI-Runtime Package

- **`src/index.ts`** – Public API exports (all public components, hooks, utilities)
- **`src/core/serializer.ts`** – UTF-8 fixed-width protocol: `serialize()`, `serializeProps()`, protocol constants
- **`src/core/render/lifecycle.ts`** – `render(player, element)` function: presents via `@minecraft/server-ui`, manages input locks
- **`src/core/render/tree.ts`** – `buildTree()`: two-phase tree building (expand components, apply inheritance)
- **`src/core/render/presenter.ts`** – `present()`: serializes tree, shows form, handles button callbacks
- **`src/core/render/session.ts`** – Session management: player roots, background logic passes, interactive transactions
- **`src/core/fabric/fiber.ts`** – Fiber operations: `createFiber()`, `deleteFiber()`, `activateFiber()`
- **`src/core/fabric/registry.ts`** – FiberRegistry: global Map, currentFiber tracking
- **`src/core/fabric/dispatcher.ts`** – MountDispatcher & UpdateDispatcher: hook implementations
- **`src/core/fabric/context.ts`** – `createContext()`, `Context<T>`, Provider implementation
- **`src/components/*.ts`** – Component functions (Panel, Text, Image, Button, Fragment)
- **`src/components/control.ts`** – `withControl()` function (canonical ordering, defaults)
- **`src/jsx/jsx-runtime.ts`** – Custom JSX runtime: `jsx`, `jsxs`, `jsxDEV`, `Fragment`
- **`src/jsx/jsx-dev-runtime.ts`** – Development JSX runtime (error checking)
- **`src/hooks/*.ts`** – React-like hooks (useState, useEffect, useRef, useContext, useReducer, etc.)

### Resource-Pack (Test Addon)

- **`packs/BP/scripts/main.ts`** – Entry point, button handler calling `present()`
- **`packs/BP/scripts/UI/Example.tsx`** – Component factory using framework components
- **`packs/RP/ui/_ui_defs.json`** – Declares which JSON UI files to load and byte ranges
- **`packs/RP/ui/server_form.json`** – Maps component types to JSON UI control definitions
- **`packs/RP/ui/core-ui/common/control.json`** – Decodes serialized data via byte offset bindings
- **`packs/RP/ui/core-ui/components/*.json`** – Individual component decoders (text.json, panel.json, etc.)
- **`config.json`** – Regolith build configuration with bundler filter

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
- **Focus:** Serialization correctness, field ordering, hook state transitions
- **Helper:** `withControlForTest()` to exclude children from control props during tests

**Example test pattern:**
```ts
import { serializeProps } from '../serializer';

test('panel serialization', () => {
  const [payload, bytes] = serializeProps({
    type: 'panel',
    width: 100,
    height: 50,
  });
  expect(payload).toMatch(/^bcuiv0002s:panel/);  // Header + type
  expect(payload.length).toBeGreaterThanOrEqual(92);  // At least header + type
});
```

### JSON UI Decoding Pattern

Resource Pack slices serialized data by fixed byte offsets using JSON UI bindings:

```jsonc
{
  "binding_type": "view",
  "source_property_name": "('%.35s' * #rem_after_header)",  // Skip 9-char header
  "target_property_name": "#raw_type"
},
{
  "binding_type": "view",
  "source_property_name": "('%.32s' * #raw_type_core)",     // Extract 32 chars (skip 2-char prefix + 1 marker)
  "target_property_name": "#type_padded"
}
```

## Breaking Change Guards

- **Never** modify `TYPE_WIDTH`, `PAD_CHAR`, or canonical field order
- **Never** change the 9-char header format (`bcui` + version)
- **Always** append new fields to end; use `reserveBytes()` for future space
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

**Rules:**
- Hooks must be called in consistent order (no conditional hook calls)
- Hooks are stored per-component-instance in FiberRegistry
- `useEffect` cleanup functions run on instance deletion

## Integration Points

- **Framework imports:** `import { present, Text, Panel } from '@bedrock-core/ui'`
- **Minecraft APIs:** `@minecraft/server` for events, `@minecraft/server-ui` for forms
- **Build system (addon):** Regolith with Node.js bundler filter for TypeScript compilation
- **Resource Pack bindings:** JSON UI string manipulation for fixed-width field extraction

## Project-Specific Conventions

- **Workspace linking:** Both packages use local workspace links in `package.json`
- **Component registration:** Always update both `server_form.json` control mapping AND `_ui_defs.json` byte ranges when adding types
- **Byte management:** Never modify existing byte ranges – only append new ranges for component-specific data
- **Error messages:** Include `[ComponentName]` prefix in logs for debugging

## Start Exploring

1. **Protocol details:** `packages/ui-runtime/src/core/serializer.ts`
2. **Working component example:** `packages/ui-runtime/src/components/Panel.ts`
3. **Test patterns:** `packages/ui-runtime/src/core/__tests__/serializer.test.ts`
4. **Addon integration:** `packages/resource-pack/packs/BP/scripts/UI/Example.tsx`
5. **JSON UI decoder:** `packages/resource-pack/packs/RP/ui/core-ui/components/text.json`
