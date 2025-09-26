## @bedrock-core/ui – AI Coding Instructions

Essential knowledge for AI agents working on this Minecraft Bedrock UI serialization library. Follow established patterns; don't invent new formats.

### Core Architecture

This library serializes declarative component trees into compact strings that get injected into `@minecraft/server-ui` form titles. A companion JSON UI resource pack decodes these payloads to render rich UIs beyond native form limitations.

**Critical flow:** component factory → `serialize(form)` → `present(form, player, component)` → JSON UI decodes by fixed byte offsets.

### Key Files & Responsibilities

- **`src/core/serializer.ts`**: UTF-8 fixed-width protocol implementation with `serialize()` function
- **`src/present.ts`**: Orchestrates `component.serialize(form)` then `form.show(player)`
- **`src/core/components/**/*.ts`**: Pure component factories returning objects with `serialize` method
- **`src/types/component.ts`**: Core `Component` interface with `serialize(form: CoreUIFormData): void`
- **`src/index.ts`**: Public API re-exports

### Serialization Protocol (Never Break This)

```
Payload: bcuiv0001 + field1 + field2 + ...
         ^^^^^^^^^ 9-char header (bcui + VERSION)
```

**Field Structure:** `[prefix][padded_value][marker]`

- Type prefixes: `s:` (string) | `i:` (int) | `f:` (float) | `b:` (bool) | `r:` (reserved)
- Padding: only `;` character for UTF-8 safe truncation
- Markers: unique 1-char from `0-9A-Za-z-_` to prevent JSON UI subtraction conflicts

**Fixed Widths (never change):**

- String: 32 bytes → 35 total (2 prefix + 32 + 1 marker)  
- Int: 16 bytes → 19 total
- Float: 24 bytes → 27 total  
- Bool: 5 bytes → 8 total

**Critical Constants in `serializer.ts`:**

```ts
const VERSION = 'v0001';           // Only update with migrations
const PAD_CHAR = ';';              // Never change
const TYPE_WIDTH = { s: 32, i: 16, f: 24, b: 5 };
```

### Component Pattern (Follow Exactly)

Components are pure factories returning objects with a `serialize` method:

```ts
export function Panel(props: PanelProps): Component {
  return {
    serialize: (form: CoreUIFormData): void => {
      // 1. Build serializable object (primitives only)
      const serializable = { type: 'panel', ...primitiveProps };
      
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
- Dimension props accept `number | string`, fallback to `'default'`
- Boolean values serialize as lowercase `'true'`/`'false'`
- Use `Number.isInteger()` to choose `i:` vs `f:` prefixes

Start exploring: `core/serializer.ts` for protocol details, `core/components/Panel.ts` for working patterns.
