/** @jsxImportSource @bedrock-core/ui */
import { Button, Card, Divider } from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';
import { List, Panel, Scroll, Text, useState } from '@bedrock-core/ui';

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

        <Divider width={96} />

        {/* Two things that can never show together SHARE one box: both sit
            absolute in this panel and each is gated by its own carrier — the
            hint by a carried visible (the && guard becomes one at build), the
            rows by the list's count. The frozen layout reserves ONE space;
            the carriers decide which content uses it. */}
        <Panel width={96} height={50}>
          {count === 0 && (
            <Text
              position={'absolute'}
              left={0}
              top={0}
            >
              {'§7press + to start'}
            </Text>
          )}

          {/* Twenty row slots compiled behind a scroll: ONE int entry carries
              how many are real, a gate per row. `max` is the screen's
              capacity — items past it have no row to appear in, the way text
              past `maxLength` has no cell — and the scroll makes a capacity
              taller than the viewport reachable. */}
          <Scroll
            position={'absolute'}
            left={0}
            top={0}
            right={0}
            bottom={0}
          >
            <List
              max={20}
              items={Array.from({ length: Math.min(count, 20) }, (_, index) => index + 1)}
              row={(item: number | undefined): JSX.Element =>
                <Text maxLength={9}>{item === undefined ? '' : `§eitem ${item}`}</Text>}
            />
          </Scroll>
        </Panel>

        <Panel flexDirection={'row'} gap={4}>
          <Button
            enabled={count < 20}
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
