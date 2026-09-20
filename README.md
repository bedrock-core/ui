# @bedrock-core/ui

![Logo](./assets/logo/title.png)

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.

Custom JSX-driven UI system for Minecraft Bedrock: components serialize into compact strings decoded by a render pack, which draws layouts beyond what native `@minecraft/server-ui` can express.

![Preview](./assets/preview.png)

## Usage

A screen is a `*.screen.tsx` module that default-exports a component; the `ui-compiler` Regolith
filter compiles it into the pack. The catalog in the preview, sketched:

```tsx
import { Button, Image, List, Panel, Screen, Scroll, Text, useExit, useState } from '@bedrock-core/ui';
import { Card, Header } from '@bedrock-core/ui/ore-styled';

export default function Catalog({ addons }: { addons: Addon[] }) {
  const [selected, setSelected] = useState(0);
  const exit = useExit();

  return (
    <Screen>
      <Card variant={'raised'}>
        <Header title={'Addons'} onClose={exit} />
        <Panel flexDirection={'row'} gap={4}>
          <Scroll width={110} height={160}>
            <List max={16} items={addons} row={(addon, index) => (
              <Button onPress={() => setSelected(index)}>
                <Image live={true} width={16} height={16} texture={addon?.icon ?? ''} />
                <Text maxLength={16}>{addon?.name ?? ''}</Text>
              </Button>
            )} />
          </Scroll>
          <Text maxLength={24}>{addons[selected]?.name ?? ''}</Text>
        </Panel>
      </Card>
    </Screen>
  );
}
```

```tsx
import { render } from '@bedrock-core/ui';

render(<Catalog addons={addons} />, player);
```

## Documentation

https://bedrock-core.drav.dev

## Contributing

Discord: https://bedrock-core.drav.dev/discord

## License

MIT
