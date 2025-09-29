# @bedrock-core/

## Why?

f*** JSON UI, and I refuse to release an addon without a custom UI knowing I'm able. So with this I just will need to make each component I need once and forget and not re-learn how this f*ing mess of a system.

Even if you know how JSON UI works, working around the bindings, variables, formatting and ton of limitiations it has is a pain.
With this you just make the UI and that is it.

> ⚠️ Alpha Status: Active alpha. Breaking changes may ship without deprecation until 1.0.0. Pin exact versions for stability.
---
> This is not ready for production use in complex packs or Marketplace work.

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
| Serialization Protocol | UTF‑8 fixed-width, semicolon full segments | `src/core/serializer.ts` |
| Presentation Adapter | Inject serialized payload + register form controls | `src/index.ts` |
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
const ui = Panel({ display: 'flex', orientation: 'vertical', children: [
    Text({ value: 'Player Settings' }),
    Button({ label: 'Save' }),
]});

await present(form, player, ui); // player: Player
```

---

## 🧩 Component Pattern

Each factory returns a plain object describing JSON UI properties plus a `serialize` method. (Example reflects intended pattern once TODOs are completed.)

```ts
export function Toggle({ label, checked }: ToggleProps): Component {
    return {
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

Payload always starts with a 9-character header: `bcui` + `vXXXX` (e.g., `bcuiv0001`). Decoders must skip these first 9 chars before field slicing.

Each field is composed of three conceptual parts concatenated in this order:

1. Type prefix (2 bytes)
2. Value (padded with semicolons `;` until defined byte length)
3. Unique 1‑byte field marker (disambiguates otherwise identical full regions during JSON UI subtraction)

### Field Widths (bytes)

| Type     | Prefix | Prefix Width | Type Width | Marker Width | Full Width (ps+s+ms) | Notes |
|----------|--------|--------------|------------|--------------|----------------------|-------|
| number   | `f:`   | 2            | 24         | 1            | 27                   | Numbers are not being differentiated between integers and floats, if the property to use must be an integer in json ui, floor or ceil before sending to serializer |
| boolean  | `b:`   | 2            | 5          | 1            | 8                    | |
| String   | `s:`   | 2            | maxBytes   | 1            | maxBytes             | Use serializeString(value:string, maxBytes?: number) Default maxBytes value is 32 |
| Reserved | `r:`   | 0            | variable   | 0            | variable             | Reserved type does not have marker or prefix width in the serialized data |

### Markers

Markers come from a stable ordered alphabet (`0-9A-Za-z`) plus `-` and `_`.
This limits the max number of props a component might have to 64. There is no single JSON component which
Index position = field order. If you append new fields, they receive the next marker; never reorder existing markers (backward decode offsets rely on stable sequence).
This is to avoid the 2nd known caveat (below).

### Encoding Example

```ts
import { serialize } from '@bedrock-core/ui/core/serializer';
const [encoded, bytes] = serialize({
    type: 'example',
    message: 'hello', // string → 35
    count: 123,       // number → 27
    ratio: 45.67,     // number → 27
    ok: true,         // bool → 8
});
// Per-field widths = 35 (string) + 27 (number) + 27 (number) + 8 (bool) = 89 bytes (plus 9-byte bcui+version prefix)
// NOTE: "bytes" here counts ASCII / UTF‑8 single-byte segments; multi-byte runes inside values still respect the full byte budgets via utf8Truncate.
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
},
```

**For reserved blocks (skip pattern):**

```jsonc
{
    "binding_type": "view", // reserved full_width
    "source_property_name": "('%.{RESERVED_WIDTH}s' * #rem_after_{PREV})",
    "target_property_name": "#skip_{RESERVED_NAME}"
},
{
    "binding_type": "view",
    "source_property_name": "(#rem_after_{PREV} - #skip_{RESERVED_NAME})",
    "target_property_name": "#rem_after_{RESERVED_NAME}"
},
```Placeholder reference:

- `{FIELD_NAME}` unique identifier (e.g. `type`, `visible`, `inherit_max_sibling_height`)
- `{PREV}` previous remainder token (first field uses `header`, others use previous field name)
- `{FULL_WIDTH}` from table full_width column
- `{FM_WIDTH}` table (full_width - marker_width)
- `{RESERVED_WIDTH}` reserved block width in bytes (e.g., 277)
- `{RESERVED_NAME}` unique identifier

### Concrete Multi‑Field Example

Excerpt from the live decoder (`ui/core-ui/control.json`) showing the base control properties pattern.
Remember to skip the 9-char header first (e.g., `('%.9s' * #custom_text)` to obtain header; subtract it to produce `#rem_after_header`).

```jsonc
/* Strip protocol header (9 chars) */
{ "binding_type": "view", "source_property_name": "('%.9s' * #custom_text)", "target_property_name": "#protocol_header" },
{ "binding_type": "view", "source_property_name": "(#custom_text - #protocol_header)", "target_property_name": "#rem_after_header" },

/* Field 0: type (string, 35 bytes) */
// full_width
{ "binding_type": "view", "source_property_name": "('%.35s' * #rem_after_header)", "target_property_name": "#raw_type" },
{ "binding_type": "view", "source_property_name": "(#rem_after_header - #raw_type)", "target_property_name": "#rem_after_type" },
// (full_width - marker_width) - prefix_width - padding_char (;)
{ "binding_type": "view", "source_property_name": "(('%.34s' * #raw_type) - ('%.2s' * #raw_type) - ';')", "target_property_name": "#type" },

/* Field 1: width (string, 35 bytes) */
// full_width
{ "binding_type": "view", "source_property_name": "('%.35s' * #rem_after_type)", "target_property_name": "#raw_width" },
{ "binding_type": "view", "source_property_name": "(#rem_after_type - #raw_width)", "target_property_name": "#rem_after_width" },
// (full_width - marker_width) - prefix_width - padding_char (;)
{ "binding_type": "view", "source_property_name": "(('%.34s' * #raw_width) - ('%.2s' * #raw_width) - ';')", "target_property_name": "#width" },

/* ... Fields 2-9 follow same pattern ... */

// reserved full_width
{ "binding_type": "view", "source_property_name": "('%.277s' * #rem_after_inherit_max_sibling_height)", "target_property_name": "#skip_reserved" },
{ "binding_type": "view", "source_property_name": "(#rem_after_inherit_max_sibling_height - #skip_reserved)", "target_property_name": "#serialized_data" },

/* Component-specific fields continue from #serialized_data */
```

### Base Control Properties Deserialization Order

All components inherit these base control properties, which are deserialized in this exact order after the 9-byte protocol header (`bcuiv0001`):

```text
Field 0: type (string, 35 bytes)                  - component type identifier
Field 1: width (number, 27 bytes)                 - element width
Field 2: height (number, 27 bytes)                - element height
Field 3: x (number, 27 bytes)                     - horizontal position
Field 4: y (number, 27 bytes)                     - vertical position
Field 5: visible (bool, 8 bytes)                  - visibility state
Field 6: enabled (bool, 8 bytes)                  - interaction enabled state
Field 7: layer (number, 19 bytes)                 - z-index layering
Field 8: alpha (number, 27 bytes)                 - element transparency
Field 9: inheritMaxSiblingWidth (bool, 8 bytes)   - width inheritance flag
Field 10: inheritMaxSiblingHeight (bool, 8 bytes) - height inheritance flag

Reserved: 512 - (protocol header width + all fields width bytes) = 274
(up to 512 bytes total reserved block for future expansion)
```

**Component-specific properties** are appended after the reserved block.

### Decoding Rules & Tips

- Always slice FULL field (value + prefix + marker) first, then subtract to create the remainder.
- Strip padding only after isolating the core full segment (second slice) so you don't accidentally remove semicolons in later fields.
- Never assume a marker character appears only once globally — its uniqueness is only relative to its position; treat the raw slice atomically.
- Protocol extension rule: append new fields (new markers) at the end; never reorder or shrink earlier core lengths.
- Reserved blocks are skipped entirely in deserialization—they create "gaps" in the payload that the JSON UI decoder jumps over.

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
- Modal form title length limits total payload width — keep it lean.

---

## ➕ Adding a New Component

1. Define (or reuse) interface in `types/json_ui/components.ts`.
2. Implement factory in `core/components/<Name>.ts` with `'default'` fallbacks.
3. Use `serialize(...)` helper; append new protocol segments only at the end.
4. Export via `core/components/index.ts` and `src/index.ts`.

---

## 🗺 Roadmap (Indicative)

- Beta 0.1.0
  - Basic single page non interactable Panel
    - Panel
    - Image
    - Text
- Beta 0.2.0
  - Navigation
    - Ability to have multiple non interactable "Screens" and move between them
      - Params (?)
      - navigation.exit(): void; (closes all ui's)
      - navigation.canGoBack(): boolean;
      - navigation.goBack(): void; (throws)
      - navigation.navigate(screenName: string);
    - Buttons
      - Navigation (render next screen)
      - Change values of stored (re-render current screen after button press with updated values)
- Beta 0.3.0
  - Forms
    - Special screen type which supports submitting data
    - Need to think this more
  - Form components
    - Input
    - Slider
    - Toggle
- Beta 0.4.0
  - Theming
    - Base theming for the components inspired by Ore UI
    - Possibility to make custom styles by props
    - Automatic layering following DOM tree order
- More possible plans
  - Register your own custom components
  - Compound components (components made by primitive componentes (ex: tabbar, made by 1 panel and x buttons and styling))
    - Standard stuff, dividers, tabs, menus, toast, card, badge, chip, drawers, dialogs...
  - Animation support
  - Reactive screens, for the first versions the screens will have static information and only be able to be updated after user input in a button. Need to investigate the possibility to make the information update reactively and if it is worth. It might lag a log, be very complex...
  - Preprocesor to be able to use tsx instead of function like components
  - validation for max bytes to serialize, rn no idea how much info we can cram into a string
  - Resource packs builder: currently while we do the first versions and learn the whole process we make the core resource pack by hand, making it automatic would be better and will help for the next export feature
  - Export feature: this library only will provide a way to make ui's using custom forms, but a way to export the result json might be useful for making resource packs

Everything listed here will only be made if it is possible and not extremely complicated
Order might change if I feel like it

---

## 🤝 Contributing

Let's talk in Discord <https://bedrocktweaks.net/discord>

---

## 📄 License

MIT © @DrAv0011

might change, need to look it through

---

## 🔗 Reference Docs

<https://wiki.bedrock.dev/json-ui/json-ui-intro#using-operators>
<https://wiki.bedrock.dev/json-ui/json-ui-intro#string-formatting>
<https://wiki.bedrock.dev/json-ui/json-ui-documentation>
<https://wiki.bedrock.dev/json-ui/string-to-number>

---

## What about ore-ui?

When it releases in `Number.MAX_SAFE_INTEGER` years, will deprecate this completely (as JSON-UI will not exist) and look if it is worth to remake it for ore-ui.

---

## Brain blob

We're going to make the label, to use the label as the entrance. So we're going to serialize everything that I'm able to see on the label. So, label, serialize the label, everything from the type to the next pattern, to the next, to the next. Then in the JSON, we just extract the type. From that, binding, we redirect to make the next type, and the next pattern, and place it. To a nested control, to a different thing. You know? In the title, with an arroba, binding. And amazing, and that's it. Easy.

Currently will focus on being able to load anything and use an absolute positioning model with position and size mandatory
Use only ModalFormData

- Use native element if exists
- Use label for "client" only elements

Note all "optional" props values should have a defined default in the serialized field

Props order is important, for **ALL OF THE PROPS** of each component even if there are required you should place them in return of the serialize because the order they are in that return will be the order in the JSON UI

note for serializable, because we depend on order any primitive components which will become json-ui
type and rest should always be at the top, below then should be ALL OF YOUR PROPS EXPLICITLY DEFINED with a default value
as that order will be the order you will have to deserialize in the JSON UI

```ts
  const { yourProps, ...rest } = withControledLayout(props);
  const serializable: SerializableComponent = {
    type: 'label',
    ...rest,
    yourProps
  };
```

This last part was moved inside serializer so there is no need for the user to do it explicitly

Important note: size_binding_x/y seems relative to parent size so making parent 10x10 will be 10 times larger the child
for strings use serializeString the default maxBytes is 32
