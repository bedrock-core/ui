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

## Usage

```tsx
/** @jsxImportSource @bedrock-core/ui */
import { Card, Checkbox, Toggle } from '@bedrock-core/ore-styled';
import { Screen, Text, useState, type JSX } from '@bedrock-core/ui';

export function Settings(): JSX.Element {
  const [enabled, setEnabled] = useState(false);
  const [accepted, setAccepted] = useState(false);

  return (
    <Screen>
      <Card>
        <Text>{'Settings'}</Text>
        <Toggle on={enabled} onChange={setEnabled} />
        <Checkbox on={accepted} onChange={setAccepted} label={'I agree'} />
      </Card>
    </Screen>
  );
}
```

## Documentation

https://bedrock-core.drav.dev/docs/ore-styled

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).
