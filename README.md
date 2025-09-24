# @bedrock-core/

## Why?

f*** JSON-UI, and I refuse to release an addon without a custom UI knowing I'm able. So with this I just will need to make each component I need once and forget and not relearn how this f*ing mess of a system.

> ⚠️ Alpha Status: Active alpha. Breaking changes may ship without deprecation until 1.0.0. Pin exact versions for stability.

Custom UI system for Minecraft Bedrock that serializes a virtual component tree into server form text fields. A companion JSON UI resource pack decodes the payload and renders layouts more advanced than native `@minecraft/server-ui` allows.

---

## ✨ Core Idea (Executive Summary)

Native forms expose only a handful of text slots (`title_text`, `form_button_text`, `custom_text`, etc.). These strings can be read via JSON UI binding expressions. We exploit this by:

1. Building a declarative component tree (`Panel`, `Text`, `Button`, etc.)
2. Serializing compact fixed-width field segments into a single string
3. Injecting that payload into a form title via `present(...)`
4. Having the resource pack parse segments by byte offset to drive conditional rendering

Result: Advanced layouts, conditional logic, and style variants without custom networking.

---

## 🧱 Architecture Overview

| Layer | Responsibility | Key Files |
|-------|----------------|-----------|
| Component Factories | Pure functions returning `Functional<T>` objects | `src/core/components/*.ts` |
| Type Contracts | JSON UI spec-aligned structural interfaces | `src/types/json_ui/*.ts` |
| Serialization Protocol | UTF‑8 fixed-width, semicolon padded segments | `src/core/serializer.ts` |
| Presentation Adapter | Inject serialized payload + register form controls | `src/present.ts` |
| Public Entry | Re-exports factories + types | `src/index.ts` |

`Functional<T>` augments a structural component with `serialize(form: FormData): string`.

---

## 📦 Installation

```bash
yarn add @bedrock-core/ui
# Requires a resource pack implementing the decoding logic (not part of this repo)
```

Peer deps expected in the host environment: `@minecraft/server` ≥ 2.1.0, `@minecraft/server-ui` ≥ 2.0.0.

---

## 🚀 Quick Start

```ts
import { ModalFormData } from '@minecraft/server-ui';
import { present, Panel, Text, Button } from '@bedrock-core/ui';

const form = new ModalFormData();
const ui = Panel({ display: 'flex', orientation: 'vertical' }, [
    Text({ value: 'Player Settings' }),
    Button({ label: 'Save' }),
]);

await present(form, player, ui); // player: Player
```

---

## 🧩 Component Pattern

Each factory returns a plain object describing JSON UI properties plus a `serialize` method. (Example reflects intended pattern once TODOs are completed.)

```ts
export function Toggle({ label, checked }: ToggleProps): Functional<ToggleComponent> {
    return {
        type: 'toggle',
        serialize(form) {
            form.toggle(label, { defaultValue: checked });
            return serialize(label, !!checked); // 32 + 5 bytes
        },
    };
}
```

Conventions:

- Dimension props fallback to `'default'` (never `undefined`).
- Factory prop names are camelCase; emitted JSON UI keys follow spec snake_case.
- No side-effects inside factory body; all form API calls occur in `serialize`.

---

## 🔐 Serialization Protocol

Defined in `core/serializer.ts`.

Each field is composed of three conceptual parts concatenated in this order:

1. Type prefix (2 bytes) — `s:` | `i:` | `f:` | `b:`
2. Core padded value region (fixed UTF‑8 byte length; semicolon `;` padded / truncated)
3. Unique 1‑byte field marker (disambiguates otherwise identical padded regions during JSON UI subtraction)

Padding ALWAYS applies only to the value region (prefix is never padded). The marker is never removed until after a field is fully sliced out.

### Field Widths (bytes)

| Type   | Prefix | Core Padded Length | Marker | Full Field Width (slice length) |
|--------|--------|-------------------:|-------:|--------------------------------:|
| String | `s:`   | 32                 | 1      | 35 |
| Int    | `i:`   | 16                 | 1      | 19 |
| Float* | `f:`   | 24                 | 1      | 27 |
| Bool   | `b:`   | 5                  | 1      | 8  |

\* for some reason currently unknown param floats get truncated to integers in the json UI

### Markers

Markers come from a stable ordered alphabet (`0-9A-Za-z`) plus `-` and `_`.
This limits the max number of props a component might have to 64. There is no single JSON component which
Index position = field order. If you append new fields, they receive the next marker; never reorder existing markers (backward decode offsets rely on stable sequence).
This is to avoid the 2nd known caveat (below).

### Encoding Example

```ts
import { serialize } from '@bedrock-core/ui/core/serializer';
const encoded = serialize('hello', 123, 45.67, true);
// Per-field widths = 35 (string) + 19 (int) + 27 (float) + 8 (bool) = 89 bytes total
// NOTE: "bytes" here counts ASCII / UTF‑8 single-byte segments; multi-byte runes inside values still respect the padded byte budgets via utf8Truncate.
```

### Field Binding Template Pattern (Decoding)

Decoding inside the resource pack uses a progressive "slice → subtract" strategy. Each field follows a 5‑step lifecycle:

`extract_raw → update_remainder → trim_padding → extract_prefix → extract_value`

Generic template (JSON UI binding entries) — copy & replace placeholders:

```jsonc
{ "binding_type": "view", "source_property_name": "('%.{SLICE_LEN}s' * #rem_after_{PREV})", "target_property_name": "#raw_{NAME}" },
{ "binding_type": "view", "source_property_name": "(#rem_after_{PREV} - #raw_{NAME})", "target_property_name": "#rem_after_{NAME}" },
{ "binding_type": "view", "source_property_name": "('%.{PADDED_LEN}s' * #raw_{NAME})", "target_property_name": "#{NAME}_padded" },
{ "binding_type": "view", "source_property_name": "('%.2s' * #{NAME}_padded)", "target_property_name": "#{NAME}_prefix" },
{ "binding_type": "view", "source_property_name": "((#{NAME}_padded - #{NAME}_prefix) - ';')", "target_property_name": "#{NAME}_val" },
```

Placeholder reference:

- `{NAME}` unique identifier (e.g. `username`, `age`)
- `{PREV}` previous remainder token (first field uses the source binding where you extract text from)
- `{PREFIX}` one of `s: i: f: b:`
- `{PADDED_LEN}` core padded value length (see table above)
- `{SLICE_LEN}` = `{PADDED_LEN} + 3` (adds 2 prefix chars + 1 marker)

Quick constants (copy/paste):

| Type   | Core Padded | Slice Length |
|--------|-------------|-------------:|
| String | 32          | 35 |
| Int    | 16          | 19 |
| Float  | 24          | 27 |
| Bool   | 5           | 8  |

### Concrete Multi‑Field Example

Excerpt (simplified) of the live decoder (`ui/core-ui/input.json`) for four fields:

```jsonc
/* 1. STRING FIELD (32 + 2 + 1 = 35) */
{ "binding_type": "view", "source_property_name": "('%.35s' * #custom_text)", "target_property_name": "#raw_string" },
{ "binding_type": "view", "source_property_name": "(#custom_text - #raw_string)", "target_property_name": "#rem_after_string" },
{ "binding_type": "view", "source_property_name": "('%.32s' * #raw_string)", "target_property_name": "#string_padded" },
{ "binding_type": "view", "source_property_name": "('%.2s' * #string_padded)", "target_property_name": "#string_prefix" },
{ "binding_type": "view", "source_property_name": "((#string_padded - #string_prefix) - ';')", "target_property_name": "#string_val" },
/* 2. INT FIELD (16 + 2 + 1 = 19) */
{ "binding_type": "view", "source_property_name": "('%.19s' * #rem_after_string)", "target_property_name": "#raw_int" },
{ "binding_type": "view", "source_property_name": "(#rem_after_string - #raw_int)", "target_property_name": "#rem_after_int" },
{ "binding_type": "view", "source_property_name": "('%.16s' * #raw_int)", "target_property_name": "#int_padded" },
{ "binding_type": "view", "source_property_name": "('%.2s' * #int_padded)", "target_property_name": "#int_prefix" },
{ "binding_type": "view", "source_property_name": "((#int_padded - #int_prefix) - ';')", "target_property_name": "#int_val" },
/* ... continue for float + bool ... */
```

### Decoding Rules & Tips

- Always slice FULL field (value + prefix + marker) first, then subtract to create the remainder.
- Strip padding only after isolating the core padded segment (second slice) so you don't accidentally remove semicolons in later fields.
- Never assume a marker character appears only once globally — its uniqueness is only relative to its position; treat the raw slice atomically.
- Protocol extension rule: append new fields (new markers) at the end; never reorder or shrink earlier core lengths.

UTF‑8 Safety: `utf8Truncate` ensures multi‑byte characters are not cut mid sequence when enforcing byte budgets.

### UTF‑8 Safety

`utf8Truncate` prevents cutting surrogate pairs; always rely on helper functions.

---

## 🛠 Filling the TODOs

Current `serialize` gaps: `Button`, `Image`, `Panel`, `Text`, `Dropdown`, `Slider`, `Toggle`.

Implementation guidance:

1. Register interactive control first (`form.toggle(...)`, `form.slider(...)`, etc.).
2. Encode only necessary state (labels, indices, booleans, layout flags).
3. Return a single compact string. Nested structures may concatenate child payloads in order.

Extension strategy: reserve a trailing block for future versioning instead of changing earlier offsets.

---

## 🧪 Development Workflow

| Action | Command |
|--------|---------|
| Build | `yarn build` |
| Lint | `yarn lint` |
| Tests | `yarn test` |
| Coverage | `yarn coverage` |

Place tests under `src/**/__tests__/**` or `*.test.ts` (excluded from build output).

---

## ⚠️ Known Caveats / Notes

- JSON UI string ops with numbers can behave unpredictably; prefix markers before numeric-derived substrings client-side.
- Subtraction operator (`-`) removes all occurrences; use distinct prefixes to avoid collisions.
- Modal form title length limits total payload size — keep it lean.

---

## ➕ Adding a New Component

1. Define (or reuse) interface in `types/json_ui/components.ts`.
2. Implement factory in `core/components/<Name>.ts` with `'default'` size fallbacks.
3. Use `serialize(...)` helper; append new protocol segments only at the end.
4. Export via `core/components/index.ts` and `src/index.ts`.

---

## 🗺 Roadmap (Indicative)

- Implement all serialization placeholders.
- Add versioned multiplex payload format.
- Encode child ordering + layout metadata for nested panels.
- Investigate lightweight compression (post‑MVP).

---

## 🤝 Contributing

Lightweight PRs welcome. Preserve protocol compatibility; document any extension rationale.

---

## 📄 License

MIT © @DrAv0011

---

## 🔗 Reference Docs

<https://wiki.bedrock.dev/json-ui/json-ui-intro#using-operators>
<https://wiki.bedrock.dev/json-ui/json-ui-intro#string-formatting>
<https://wiki.bedrock.dev/json-ui/json-ui-documentation>
<https://wiki.bedrock.dev/json-ui/string-to-number>

## Brain blob

We're going to make the label, to use the label as the entrance. So we're going to serialize everything that I'm able to see on the label. So, label, serialize the label, everything from the type to the next pattern, to the next, to the next. Then in the JSON, we just extract the type. From that, binding, we redirect to make the next type, and the next pattern, and place it. To a nested control, to a different thing. You know? In the title, with an arroba, binding. And amazing, and that's it. Easy.

Currently will focus on being able to load anything and use an absolute positioning model with position and size mandatory
Use only ModalFormData

- Use native element if exists
- Use label for "client" only elements

Note all "optional" props values should have a defined default in the serialized field
