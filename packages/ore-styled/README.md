# @bedrock-core/ore-styled

> Optional prebuilt Ore-UI styled compound components for [@bedrock-core/ui](https://github.com/bedrock-core/ui).

Drop-in styled components that match Minecraft's modern Ore-UI look. Skip the styling boilerplate when you want consistent buttons, toggles, menu rows, and cards in your addon UI.

## Install

```bash
yarn add @bedrock-core/ore-styled
# or
npm install @bedrock-core/ore-styled
```

## Components

- `Button` — styled press button with variants
- `Card` — content container with Ore-UI framing
- `Checkbox` — boolean input with on/off textures
- `Input` — text field; pressing it opens the native modal text field
- `Dropdown` — selector field with a chevron; pressing it opens the native modal dropdown
- `Slider` — field drawn as a track + thumb (positioned by value); pressing it opens the native modal slider
- `RadioGroup` / `Radio` — single-select group
- `Toggle` — switch-style boolean input
- `ToggleButtonGroup` / `ToggleButtonItem` — multi-button selector
- `Header` — screen chrome: back button, breadcrumb trail, close button
- `MenuRow` — browse-list row: thumbnail, title, muted subtitle, `›` chevron, nesting depth
- `Form` — native modal form with styled fields (see below)
- `Divider` — horizontal/vertical separator
- `ItemSlot` — single inventory slot rendering an `ItemStack` with optional overlay texture
- `ItemContainer` — grid of `ItemSlot` components covering a `Container`'s slots
- `EquipmentSlots` — vertical column of equipment slots (helmet → boots + offhand) from an `EntityEquippableComponent`
- `theme` — design tokens for ad-hoc styling (typed `OreTheme`, with `ButtonTextStyle` for button label styling)

`Header` and `MenuRow` take `DisplayText` for their text (a literal string, a translation key, or a
`RawMessage`), so they localize per player without any extra wiring — see
[`@bedrock-core/i18n`](https://github.com/bedrock-core/ui/blob/main/packages/i18n/README.md).

## Usage

```tsx
import { Card, Toggle, Checkbox } from '@bedrock-core/ore-styled';
import { Text, useState } from '@bedrock-core/ui';

export const Settings = () => {
  const [enabled, setEnabled] = useState(false);
  const [accepted, setAccepted] = useState(false);

  return (
    <Card>
      <Text>{'Settings'}</Text>
      <Toggle on={enabled} onChange={setEnabled} />
      <Checkbox checked={accepted} onChange={setAccepted} label={'I agree'} />
    </Card>
  );
};
```

## Forms

`Form` is a native `ModalFormData`-backed modal with an atomic, single-submit lifecycle: every field's value arrives once, in `onSubmit`, keyed by its `name`. Field members mirror the runtime's `Form` namespace but come pre-styled, and each takes a `label` (composed here — the runtime primitives are label-free):

- `Form.Toggle` — settings-row switch
- `Form.Checkbox` — boolean with on/off textures
- `Form.Radio` — single-select group from `options`
- `Form.ToggleButton` — multi-button selector from `options`
- `Form.Slider` — track + thumb, label above
- `Form.Dropdown` — native modal dropdown, label above
- `Form.Input` — text field, label above
- `Form.Button` — submit / exit action button (variant defaults to `primary` for submit, `secondary` for exit)

A form must declare exactly one `Form.Button type="submit"` (and at most one `type="exit"`), placed anywhere in the flow.

```tsx
import { Form } from '@bedrock-core/ore-styled';
import { Text } from '@bedrock-core/ui';

export const Settings = () => (
  <Form onSubmit={(v) => { v.sound; v.volume; v.mode; }}>
    <Text>{'§lSettings'}</Text>
    <Form.Toggle   name={'sound'}  label={'Sound'} defaultValue={true} />
    <Form.Slider   name={'volume'} label={'Volume'} min={0} max={10} />
    <Form.Dropdown name={'mode'}   label={'Mode'} options={['Easy', 'Hard']} />
    <Form.Input    name={'nick'}   label={'Nickname'} />
    <Form.Button   type={'submit'} label={'Save'} />
  </Form>
);
```

Mix a modal `<Form>` and an ActionForm-style screen across separate `render()` calls (e.g. via navigation) — never nested.

## Resource pack

These components render through the companion `@bedrock-core/ui` resource pack — make sure the latest `.mcpack` from the [releases page](https://github.com/bedrock-core/ui/releases/latest) is installed alongside your addon.

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
