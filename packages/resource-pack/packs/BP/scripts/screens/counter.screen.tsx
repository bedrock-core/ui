/** @jsxImportSource @bedrock-core/ui */
import { Button, Card } from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';
import { Panel, Text, useState } from '@bedrock-core/ui';

/**
 * A COMPILED FORM screen, written exactly like every other screen here.
 *
 * Nothing in this file says which screen it is drawn on. It has no
 * `<Container>` at its root, so the build compiles it for the form host — the
 * same JSX, the same components, a different machine underneath.
 *
 * What that buys, against the same screen serialized: the layout is written
 * into the pack once and never travels again. Opening this form sends the
 * title and two short strings — the count, and whether each button may be
 * pressed — instead of a control block per element on every press.
 *
 * The costs are the compiled ones, and both are visible here. `maxLength` is
 * what reserves room for a string that changes, and the build refuses the
 * screen without it rather than freezing the text. And the shape cannot move:
 * a button is `enabled` or not, never present or absent.
 */
export default function Counter(): JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Panel flexDirection={'column'} padding={8} gap={6} alignItems={'center'}>
      <Card>
        <Text>{'§fCOMPILED FORM'}</Text>

        {/* Live: one entry carries this string whole, formatting codes and all. */}
        <Text maxLength={16}>{`count ${count}`}</Text>

        {/* Carried visible: the build probes that state flips this, spends one
            entry on it, and the compiled gate hides the subtree client-side.
            The shape never changes — the hint is always in the tree. */}
        <Text visible={count === 0}>{'§7press + to start'}</Text>

        <Panel flexDirection={'row'} gap={4}>
          <Button
            enabled={count < 9}
            onPress={(): void => { setCount(value => value + 1); }}
          >
            {'+'}
          </Button>

          <Button
            enabled={count > 0}
            onPress={(): void => { setCount(value => value - 1); }}
          >
            {'-'}
          </Button>
        </Panel>
      </Card>
    </Panel>
  );
}
