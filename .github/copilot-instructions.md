## @bedrock-core/ui – AI Coding Instructions

Essential knowledge for AI agents working on this Minecraft Bedrock UI serialization library. Follow established patterns; don't invent new formats.

### Core Architecture

This library serializes declarative component trees into compact strings that get injected into `@minecraft/server-ui` form controls. A companion JSON UI resource pack decodes these payloads to render rich UIs beyond native form limitations.

**Critical flow:** component factory → `serialize(form)` → `present(player, component)` → JSON UI decodes by fixed byte offsets.

### Component Routing System ("Label-as-Entry-Point")

**Client-Only Components** (`Panel`, `Text`, `Image`): Use `form.label()` calls → `screen_container.json` factory maps to `@core-ui_common.component_router` → Each component JSON uses conditional bindings `(#type = 'panel') and #visible` to selectively render.

**Native Form Components** (`Input`, `Toggle`, `Slider`, `Dropdown`): Bypass router, use dedicated factory control IDs like `"toggle": "@server_form.custom_toggle"` while sharing the same serialization protocol.

### Key Files & Responsibilities

- **`src/core/serializer.ts`**: UTF-8 fixed-width protocol implementation with `serialize()` function
- **`src/core/components/**/*.ts`**: Pure component factories returning objects with `serialize` method
- **`src/types/component.ts`**: Core `Component` interface with `serialize(form: CoreUIFormData): void`
- **`src/index.ts`**: Public API re-exports and `present(player, component)` orchestration
- **`src/core/components/index.ts`**: `withControl()` function enforcing canonical field ordering
- **`assets/RP/ui/core-ui/common/component_router.json`**: Dispatcher for client-only components
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

Components are pure factories returning objects with a `serialize` method:

```ts
export function Panel({ children, ...rest }: PanelProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // 1. Build serializable object (primitives only)
      const serializable: SerializableComponent = {
        type: serializeString('panel'),
        ...rest,
      };
      
      // 2. Serialize to string payload  
      const [result, bytes] = serialize(serializable);
      
      // 3. Register with form (triggers JSON UI)
      form.label(result);
      
      // 4. Handle children/nested components
      children.forEach(child => child.serialize(form));
    }
  };
}
```

**Key Rules:**

- `serialize` method takes `CoreUIFormData`, returns `void`
- Call `form.label()`, `form.toggle()`, etc. to register UI elements
- Use `serialize()` helper from `core/serializer.ts` for payload encoding
- Handle component children by calling their `serialize` methods
- **Field order is critical**: After type, control fields must be: width, height, x, y, visible, enabled, layer, alpha, inheritMaxSiblingWidth, inheritMaxSiblingHeight, __reserved
- **String values must use `serializeString()`** - native strings throw errors

### Development Workflow

- **Build**: `yarn build` (TypeScript compilation to `dist/`)
- **Test**: `yarn test` (Vitest with files in `src/**/__tests__/**`)  
- **Lint**: `yarn lint` (ESLint)
- **Entry**: `dist/index.js` (ESM module)

### Testing Patterns

Tests focus on serialization correctness and field ordering:

```ts
// Check payload structure
const [result, bytes] = serialize({ type: 'test', value: 'hello' });
expect(result).toMatch(/^bcuiv0001s:test/); // Header + first field

// Verify field slicing (see serializer.test.ts for helpers)
function sliceFieldWithPlan(payload: string, index: number, plan: TKey[]): string
```

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
