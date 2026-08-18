# @bedrock-core/ore-styled

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Prebuilt components for [`@bedrock-core/ui`](https://github.com/bedrock-core/ui) that match
Minecraft's modern Ore-UI look. Drop them in instead of styling primitives by hand: buttons,
cards, toggles, menu rows and a complete set of native form fields, all drawn with authentic
textures shipped in the `@bedrock-core/ui` render pack.

## Install

```bash
yarn add @bedrock-core/ore-styled
```

It also ships inside the umbrella package as `@bedrock-core/ui/ore-styled`. These components draw
through the render pack, so the `core-ui-v*.mcpack` from the matching
[release](https://github.com/bedrock-core/ui/releases/latest) has to be installed in the world.

## What it gives you

- **Controls** — `Button`, `Card`, `Toggle`, `Checkbox`, `RadioGroup`/`Radio`,
  `ToggleButtonGroup`/`ToggleButtonItem`, `Input`, `Dropdown`, `Slider`, `Divider`
- **Chrome** — `Header` (back button, breadcrumb trail, close button) and `MenuRow` (thumbnail,
  title, muted subtitle, `›` chevron, nesting depth)
- **Item views** — `ItemSlot` for one `ItemStack`, `ItemContainer` for a whole `Container`,
  `EquipmentSlots` for an `EntityEquippableComponent`
- **`Form`** — a native `ModalFormData` modal with an atomic single-submit lifecycle, plus styled,
  labelled fields: `Form.Toggle`, `.Checkbox`, `.Radio`, `.ToggleButton`, `.Slider`, `.Dropdown`,
  `.Input`, `.Button`
- **`theme`** — the design tokens (typed `OreTheme`) for styling your own components to match

`Header` and `MenuRow` take `DisplayText`, so a literal, a translation key or a `RawMessage` all
work and localize per player with no extra wiring.

## Usage

```tsx
/** @jsxImportSource @bedrock-core/ui */
import { Card, Checkbox, Toggle } from '@bedrock-core/ore-styled';
import { Text, useState, type JSX } from '@bedrock-core/ui';

export function Settings(): JSX.Element {
  const [enabled, setEnabled] = useState(false);
  const [accepted, setAccepted] = useState(false);

  return (
    <Card>
      <Text>{'Settings'}</Text>
      <Toggle on={enabled} onChange={setEnabled} />
      <Checkbox checked={accepted} onChange={setAccepted} label={'I agree'} />
    </Card>
  );
}
```

`<Form>` works the same way, with one rule of its own: every field value arrives once, in
`onSubmit`, keyed by its `name`, and the form must declare exactly one `Form.Button type="submit"`
(plus at most one `type="exit"`), placed anywhere in the flow. Mix a modal `<Form>` and an
ActionForm-style screen across separate `render()` calls — via navigation, say — never nested.

## Documentation

- [ore-styled](https://bedrock-core.drav.dev/docs/ui/ore-styled) — every component, its props and
  its variants, one page each
- [`theme`](https://bedrock-core.drav.dev/docs/ui/ore-styled/theme) — the token set
- [`Form`](https://bedrock-core.drav.dev/docs/ui/ore-styled/Form) — the modal lifecycle and each
  styled field

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
