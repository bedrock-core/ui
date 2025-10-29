## @bedrock-core/ui – AI Coding Instructions

Essential knowledge for AI agents working on this Minecraft Bedrock UI serialization library. Follow established patterns; don't invent new formats.

### Research Guidelines

**For any questions related to Minecraft add-ons or Minecraft development:** Always consult these authoritative sources before suggesting answers:

1. **Microsoft Learn Minecraft Creator Documentation** (https://learn.microsoft.com/en-us/minecraft/creator/) - Use Microsoft Docs MCP to search for official documentation, API references, scripting guides, and best practices for Minecraft Bedrock development.

2. **Bedrock-OSS/bedrock-wiki** - Use GitHub's MCP server to search this community-maintained wiki for additional tutorials, examples, and community knowledge about JSON UI, entities, blocks, items, and more.

**Search Strategy:** Query **both sources simultaneously** when researching Minecraft-related questions. The community wiki often contains practical examples, workarounds, and techniques not documented officially, while Microsoft Learn provides authoritative API specifications. Combine information from both sources and use the most complete, accurate, and relevant details found across either documentation set. If information conflicts, prefer Microsoft Learn for API contracts and the wiki for implementation patterns.

### Core Architecture

This library serializes declarative JSX/component trees into compact strings that get injected into `@minecraft/server-ui` form controls. A companion JSON UI resource pack decodes these payloads to render rich UIs beyond native form limitations.

**Critical flow:** JSX element → `serialize(element, form)` → `render(player, element)` → JSON UI decodes by fixed byte offsets.

**JSX Support:** The library now uses a custom JSX runtime (`@bedrock-core/ui/jsx-runtime`) that transforms JSX into `JSX.Element` objects (format: `{ type: string, props: {...} }`). Components are pure functions returning these elements.

### Component Routing System ("Label-as-Entry-Point")

**Client-Only Components** (`Panel`, `Text`, `Image`, `Fragment`): Use `form.label()` calls → `screen_container.json` factory maps to `@core-ui_common.component_router` → Each component JSON uses conditional bindings `(#type = 'panel') and #visible` to selectively render.

**Native Form Components** (not yet implemented): Will bypass router, use dedicated factory control IDs like `"toggle": "@server_form.custom_toggle"` while sharing the same serialization protocol.

### Key Files & Responsibilities

- **`src/core/serializer.ts`**: UTF-8 fixed-width protocol implementation with `serialize()` and `serializeProps()` functions
- **`src/core/components/**/*.ts`**: Pure component functions returning `JSX.Element` objects
- **`src/core/components/control.ts`**: `withControl()` function enforcing canonical field ordering for all components
- **`src/jsx/jsx-runtime.ts`**: Custom JSX runtime that transforms JSX to `{ type, props }` elements
- **`src/core/render.ts`**: `render()` function that presents components to players via `@minecraft/server-ui`
- **`src/index.ts`**: Public API re-exports
- **`assets/RP/ui/core-ui/common/component_router.json`**: Dispatcher for client-only components
- **`assets/RP/ui/core-ui/common/control.json`**: Base control bindings template with protocol decoder
- **`assets/RP/ui/core-ui/components/*.json`**: Individual component decoders with conditional rendering

### Serialization Protocol (Never Break This)

```
Payload: bcuiv0001 + field1 + field2 + ...
         ^^^^^^^^^ 9-char header (bcui + VERSION)
```

**Field Structure:** `[prefix][padded_value][marker]`

- Type prefixes: `s:` (string) | `n:` (number) | `b:` (bool) | `r:` (reserved)
- Padding: only `;` character for UTF-8 safe truncation
- Markers: unique 1-char from `0-9A-Za-z-_` to prevent JSON UI subtraction conflicts

**Fixed Widths (never change):**

- String: 32 bytes → 35 total (2 prefix + 32 + 1 marker)  
- Number: 24 bytes → 27 total
- Bool: 5 bytes → 8 total
- Reserved: Variable bytes (no prefix/marker for easier JSON UI skipping)

**Critical Constants in `serializer.ts`:**

```ts
const VERSION = 'v0001';           // Only update with migrations
const PAD_CHAR = ';';              // Never change
const TYPE_WIDTH = { s: 32, n: 24, b: 5, r: 0 };
```

### Component Pattern (Follow Exactly)

Components are pure functions returning `JSX.Element` objects:

```ts
export const Panel: FunctionComponent<PanelProps> = ({ children, ...rest }: PanelProps): JSX.Element => ({
  type: 'panel',
  props: {
    ...withControl(rest),
    children,
  },
});
```

**Key Rules:**

- Components are `FunctionComponent<T>` returning `JSX.Element` with `{ type, props }` structure
- Use `withControl(rest)` to apply standard control props (width, height, x, y, visible, enabled, layer, alpha, etc.)
- `withControl()` returns props in **canonical order** - this is critical for serialization
- **Field order is critical**: After type, control fields must be: width, height, x, y, visible, enabled, layer, alpha, inheritMaxSiblingWidth, inheritMaxSiblingHeight, __reserved
- **All "optional" props must have defined defaults** - no undefined/null values allowed in serialized output
- The `serialize()` function (in `serializer.ts`) handles JSX element serialization and `form.label()` calls
- String values in props are passed as-is; `serializeProps()` handles encoding internally

### Development Workflow

- **Build**: `yarn build` (TypeScript compilation to `dist/`)
- **Test**: `yarn test` (Vitest with files in `src/**/__tests__/**`)  
- **Lint**: `yarn lint` (ESLint)
- **Entry**: `dist/index.js` (ESM module)

### Testing Patterns

Tests focus on serialization correctness and field ordering:

```ts
// Check payload structure using serializeProps
const [result, bytes] = serializeProps({ type: 'test', value: 'hello' });
expect(result).toMatch(/^bcuiv0001s:test/); // Header + first field

// Verify field slicing (see serializer.test.ts for helpers)
function sliceFieldWithPlan(payload: string, index: number, plan: TKey[]): string
```

**Test Setup:**
- Vitest runs tests from `src/**/__tests__/**/*.ts` 
- Mocks for `@minecraft/server` and `@minecraft/server-ui` in `src/__mocks__/`
- Use `withControlForTest()` helper to exclude children from control props during tests

### Breaking Change Guards

- **Never** modify `TYPE_WIDTH`, `PAD_CHAR`, or field order in existing components
- **Never** change the 9-char header format (`bcui` + version)
- **Always** append new fields to end; use `reserveBytes()` for future space
- **Always** increment `VERSION` for protocol-breaking changes with migration docs

### Component Conventions  

- Props are camelCase; emitted JSON UI keys are snake_case
- Dimension props accept `number` only (no strings like "100px" or "100%")
- Boolean values serialize as lowercase `'true'`/`'false'`
- All components extend `ControlProps` requiring width, height, x, y positioning
- **All "optional" props must have defined defaults in serialized field** - no undefined values allowed
- Use `reserveBytes(n)` for future protocol expansion space

### Critical `withControl()` Function

The `withControl()` function in `src/core/components/index.ts` enforces canonical field ordering and applies defaults. It reserves 274 bytes for future expansion and ensures all components have exactly 512 total bytes. **Never modify this ordering without updating the protocol version.**

Start exploring: `core/serializer.ts` for protocol details, `core/components/Panel.ts` for working patterns.
