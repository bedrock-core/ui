# @bedrock-core/ore-styled

> Optional prebuilt Ore-UI styled compound components for [@bedrock-core/ui](https://github.com/bedrock-core/ui).

Drop-in styled components that match Minecraft's modern Ore-UI look. Skip the styling boilerplate when you want consistent buttons, toggles, tabs, and cards in your addon UI.

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
- `Tabs` / `TabList` / `Tab` / `TabPanel` — tabbed navigation
- `Toggle` — switch-style boolean input
- `ToggleButtonGroup` / `ToggleButtonItem` — multi-button selector
- `Divider` — horizontal/vertical separator
- `ItemSlot` — single inventory slot rendering an `ItemStack` with optional overlay texture
- `ItemContainer` — grid of `ItemSlot` components covering a `Container`'s slots
- `EquipmentSlots` — vertical column of equipment slots (helmet → boots + offhand) from an `EntityEquippableComponent`
- `theme` — design tokens for ad-hoc styling

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

## Resource pack

These components render through the companion `@bedrock-core/ui` resource pack — make sure the latest `.mcpack` from the [releases page](https://github.com/bedrock-core/ui/releases/latest) is installed alongside your addon.

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
