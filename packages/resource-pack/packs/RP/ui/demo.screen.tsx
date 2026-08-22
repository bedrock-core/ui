/** @jsxImportSource @bedrock-core/ui */
import type { JSX } from '@bedrock-core/ui';
import { Panel, Text } from '@bedrock-core/ui';
import { Container, Progress, Slot, SlotGrid } from '@bedrock-core/ui-runtime/compile';

/**
 * The reference container screen.
 *
 * Note what is absent: no coordinates, no slot indices, no inventory size. The
 * flexbox pass places everything, and the compiler allocates the slots and the
 * bank channel behind them. Names are the only handle the script needs.
 *
 * This file is compiled by the `ui-compile` filter and does not ship — the
 * emitted JSON UI lands in `RP/ui/compiled/demo.json` and the source is stripped
 * from the pack.
 */
export default function Demo(): JSX.Element {
  return (
    <Container padding={7} gap={4}>
      <Text>{'§fCompiled screen — no coordinates in the source'}</Text>

      <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
        <Progress name={'charge'} flexGrow={1} />
        <Slot name={'toggle'} />
      </Panel>

      <SlotGrid name={'bay'} rows={1} cols={8} />
    </Container>
  );
}
