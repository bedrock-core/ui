# @bedrock-core/ui-runtime

![Logo](../../assets/logo.svg)

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
| Component Functions | Pure functions returning `JSX.Element` objects | `src/core/components/*.ts` |
| Serialization Protocol | UTF‑8 fixed-width, semicolon-padded segments | `src/core/serializer.ts` |
| Runtime (Entry) | Orchestrates build → snapshot → show → response; owns effect loop | `src/core/runtime.ts` |
| Renderer Adapter | Serializes UI tree to a form snapshot | `src/core/rendererAdapter.ts` |
| Fiber Registry | Manages component instances and hook state | `src/core/fiber.ts` |
| Context System | React-like context providers and consumers | `src/core/context.ts` |
| Hooks System | State management and side effects | `src/core/hooks/*.ts` |

### 🔄 Component Routing System

The system uses a routing architecture to handle different component types:

**For Client-Only Components** (`Panel`, `Text`, `Image`, `Fragment`):

1. All serialized data gets injected via `form.label()` calls
2. The `screen_container.json` factory maps `"label"` entries to `@core-ui_common.component_router`
3. The `component_router` acts as a dispatcher containing all possible component types
4. Each component JSON file (e.g., `panel.json`) uses conditional bindings: `(#type = 'panel') and #visible` to determine if it should render
5. Only the matching component type renders, others remain invisible

**For Native Form Components** (not yet implemented):

- These will bypass the router and use their dedicated factory control IDs
- `"toggle": "@server_form.custom_toggle"`, `"input": "@server_form.custom_input"`, etc.
- They will still use the same serialization protocol for consistency

This "label-as-entry-point" system allows unlimited custom components while leveraging Minecraft's native form factory system for future interactive elements.

## 🧩 Component Pattern

Components are pure functions that return `JSX.Element` objects (using the custom JSX runtime):

```tsx
import { FunctionComponent, JSX } from '@bedrock-core/ui';
import { ControlProps, withControl } from './control';

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

- All components require `width`, `height`, `x`, `y` (absolute positioning, no defaults)
- **Props order is critical**: `withControl(rest)` must always be first in the props object, followed by component-specific props with default values, then `children` last
- Component prop names are camelCase; JSON UI bindings use snake_case
- Use the custom JSX runtime - no need to import React
- **All "optional" props must have defined defaults** - no undefined/null values in serialized output
- The `serialize()` function in `core/serializer.ts` handles the encoding automatically
- The `withControl()` helper applies standard control properties in canonical order

## 🔐 Serialization Protocol

Defined in `src/core/serializer.ts`.

Payload always starts with a 9-character header: `bcui` + `vXXXX` (e.g., `bcuiv0003`). Decoders must skip these first 9 chars before field slicing.

Each field is composed of three conceptual parts concatenated in this order:

1. Type prefix (2 bytes)
2. Value (padded with semicolons `;` until defined byte length)
3. Unique 1‑byte field marker (disambiguates otherwise identical full regions during JSON UI subtraction)

### Field Widths (bytes)

| Type     | Prefix | Prefix Width | Type Width | Marker Width | Full Width | Notes |
|----------|--------|--------------|------------|--------------|------------|-------|
| String   | `s:`   | 2            | 80         | 1            | 83         | Prefer to use translation keys when text larger than 32 characters is needed |
| Number   | `n:`   | 2            | 80         | 1            | 83         | Expanded to match string width in v0003 for unified field sizing |
| Boolean  | `b:`   | 2            | 5          | 1            | 8          | Serialized as `'true'` or `'false'` |
| Reserved | `r:`   | 0            | variable   | 0            | variable   | No prefix/marker for easier JSON UI skipping |

### Markers

Markers come from a stable ordered alphabet (`0-9A-Za-z-_`), limiting components to 64 props max.
Index position = field order. Never reorder existing markers (backward decode offsets rely on stable sequence).

### Encoding Example

```ts
import { serializeProps } from '@bedrock-core/ui-runtime';

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

All components inherit these base control properties, which are deserialized in this exact order after the 9-byte protocol header (`bcuiv0003`):

```text
Field 0: type (string, 83 bytes)                  - component type identifier
Field 1: width (number, 83 bytes)                 - element width
Field 2: height (number, 83 bytes)                - element height
Field 3: x (number, 83 bytes)                     - horizontal position
Field 4: y (number, 83 bytes)                     - vertical position
Field 5: visible (bool, 8 bytes)                  - visibility state (default: true)
Field 6: enabled (bool, 8 bytes)                  - interaction enabled (default: true)
Field 7: layer (number, 83 bytes)                 - z-index layering (default: 0)
Field 8: alpha (number, 83 bytes)                 - transparency (default: 1.0)
Field 9: inheritMaxSiblingWidth (bool, 8 bytes)   - width inheritance (default: false)
Field 10: inheritMaxSiblingHeight (bool, 8 bytes) - height inheritance (default: false)
Field 11: $reserved (402 bytes)                   - reserved for future expansion

Total control block: 1024 bytes (9 + 83 + 498 + 16 + 16 + 402)
```

**Component-specific properties** are appended after the reserved block.

### Decoding Rules & Tips

- Always slice FULL field (value + prefix + marker) first, then subtract to create the remainder
- Strip padding only after isolating the core full segment (second slice) so you don't accidentally remove semicolons in later fields
- Never assume a marker character appears only once globally—its uniqueness is only relative to its position
- Protocol extension rule: append new fields (new markers) at the end; never reorder or shrink earlier core lengths
- Reserved blocks are skipped entirely in deserialization—they create "gaps" in the payload that the JSON UI decoder jumps over

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
- Currently when passing a value which starts with a number into a json property which accepts numbers, for example #size_binding_x, the characters after the digits are ignored 
  E.g. x value here for json ui is the same as "100"
    <Image x={'100%%daasdasdasdx'} />
- **Container Scaling Requirement:** `size_binding_x/y` in JSON UI is relative (0-1 as percentages). To work with 0-100 percentages in TypeScript, the component deserialization container must be scaled to 1% size. This requires a `-49.5%` offset (−50% + 0.5%) to properly center the container. This offset is implemented in [screen_container.json](../resource-pack/packs/RP/ui/core-ui/common/screen_container.json).
- Subtraction operator (`-`) removes all occurrences; use distinct prefixes to avoid collisions.


## ⚠️ Breaking Change Guards

- **Never** modify `TYPE_WIDTH`, `PAD_CHAR`, or canonical field order
- **Never** change the 9-char header format (`bcui` + version)
- **Always** append new fields to end; use `reserveBytes()` for future space
- **Always** increment `VERSION` when making protocol-breaking changes (with migration docs)
- **Test rigorously** – serialization format is frozen once clients decode it

## 📖 Reference Documentation

For JSON UI decoding implementation details:

- [Bedrock Wiki - JSON UI Introduction](https://wiki.bedrock.dev/json-ui/json-ui-intro)
- [JSON UI String Operations](https://wiki.bedrock.dev/json-ui/json-ui-intro#using-operators)
- [String Formatting & Number Conversion](https://wiki.bedrock.dev/json-ui/string-to-number)
- [JSON UI Documentation](https://wiki.bedrock.dev/json-ui/json-ui-documentation)
