/** @jsxImportSource @bedrock-core/ui */
import { Button, Panel, Text, useState, type JSX } from '@bedrock-core/ui';

/**
 * The same component on every host. It never learns how `count` travels or
 * what a press physically is; the root element of the screen decides that.
 */
export function Counter(): JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Panel background={'textures/ui/dialog_background_opaque'} padding={6} gap={4}>
      <Text>{'COUNTER'}</Text>
      <Text maxLength={2}>{`${count}`}</Text>
      <Button enabled={count < 9} onPress={(): void => { setCount(n => n + 1); }}>
        <Text>{'+1'}</Text>
      </Button>
    </Panel>
  );
}
