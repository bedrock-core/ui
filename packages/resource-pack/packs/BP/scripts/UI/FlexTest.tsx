import { JSX, Panel, Text, Button, Fragment } from '@bedrock-core/ui';

/**
 * FlexTest — visually inspectable flex behavior fixture.
 *
 * Each card has a yellow header describing what it tests, then renders the
 * actual layout below. Compare in-game render against the dump output (HTML
 * reference). Anything that doesn't match expectation = a layout-engine bug.
 *
 * Wire from main.ts:  render(FlexTest, source as Player);
 */
function CardHeader({ children }: { children: string }): JSX.Element {
  return <Text>{`§e§l${children}`}</Text>;
}

function Card({ title, children }: { title: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={2} padding={4}>
      <CardHeader>{title}</CardHeader>
      <Fragment>{children}</Fragment>
    </Panel>
  );
}

// Reusable colored boxes (use §-coded text inside a Panel so we see the box).
function Box({ label, width, height, flexGrow, flexShrink }: {
  label: string;
  width?: number;
  height?: number;
  flexGrow?: number;
  flexShrink?: number;
}): JSX.Element {
  return (
    <Panel width={width} height={height} flexGrow={flexGrow} flexShrink={flexShrink}>
      <Text>{label}</Text>
    </Panel>
  );
}

export function FlexTest(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={6} gap={6}>
      {/* Page title */}
      <Text>{'§b§l@bedrock-core/ui — flex test fixture'}</Text>
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TEST 1: row, fixed children, sequential placement                  */}
      <Card title={'1. row, 3 fixed boxes, no gap'}>
        <Panel flexDirection={'row'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a60'} width={60} height={12} />
          <Box label={'§a80'} width={80} height={12} />
        </Panel>
        <Text>{'§7expect: x=0, x=40, x=100'}</Text>
      </Card>
      {/* TEST 2: row with gap                                               */}
      <Card title={'2. row, gap=10'}>
        <Panel flexDirection={'row'} gap={10}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: x=0, 50, 100'}</Text>
      </Card>
      {/* TEST 3: row with percent gap                                       */}
      <Card title={'3. row, gap=10% of own width'}>
        <Panel flexDirection={'row'} gap={'10%'} width={200}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: gap=20px (10% of 200), x=0, 60, 120'}</Text>
      </Card>
      {/* TEST 4: justifyContent variants                                    */}
      <Card title={'4a. justifyContent=center'}>
        <Panel flexDirection={'row'} justifyContent={'center'} width={200}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: 80 free / 2 = 40 left margin'}</Text>
      </Card>
      <Card title={'4b. justifyContent=space-between'}>
        <Panel flexDirection={'row'} justifyContent={'space-between'} width={200}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: x=0, 80, 160'}</Text>
      </Card>
      <Card title={'4c. justifyContent=space-evenly'}>
        <Panel flexDirection={'row'} justifyContent={'space-evenly'} width={200}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: gaps 40/40/40'}</Text>
      </Card>
      {/* TEST 5: alignItems on a row                                        */}
      <Card title={'5. alignItems=center (row, h=40)'}>
        <Panel flexDirection={'row'} alignItems={'center'} width={200} height={40} gap={6}>
          <Box label={'§a10'} width={40} height={10} />
          <Box label={'§a20'} width={40} height={20} />
          <Box label={'§a30'} width={40} height={30} />
        </Panel>
        <Text>{'§7expect: each box centered vertically'}</Text>
      </Card>
      {/* TEST 6: flex-grow distribution                                     */}
      <Card title={'6a. flex:1 / flex:1 / flex:1 (equal share)'}>
        <Panel flexDirection={'row'} width={300} gap={6}>
          <Box label={'§af'} flexGrow={1} height={12} />
          <Box label={'§af'} flexGrow={1} height={12} />
          <Box label={'§af'} flexGrow={1} height={12} />
        </Panel>
        <Text>{'§7expect: each = (300-12)/3 = 96 wide'}</Text>
      </Card>
      <Card title={'6b. flex:1 / flex:2 / flex:1 (CSS auto basis)'}>
        <Panel flexDirection={'row'} width={300} gap={6}>
          <Box label={'§af1'} flexGrow={1} height={12} />
          <Box label={'§af2'} flexGrow={2} height={12} />
          <Box label={'§af1'} flexGrow={1} height={12} />
        </Panel>
        <Text>{'§7expect: ~75/138/75 (basis=12 each + 1/2/1 share of free)'}</Text>
      </Card>
      <Card title={'6c. fixed + flex:1 (fill remaining)'}>
        <Panel flexDirection={'row'} width={300} gap={6}>
          <Box label={'§a100'} width={100} height={12} />
          <Box label={'§af'} flexGrow={1} height={12} />
        </Panel>
        <Text>{'§7expect: 100, then 194'}</Text>
      </Card>
      {/* TEST 7: flex-shrink (overflow)                                     */}
      <Card title={'7a. shrink: 3 boxes of 100 in 200 (default shrink:1)'}>
        <Panel flexDirection={'row'} width={200}>
          <Box label={'§c100'} width={100} height={12} />
          <Box label={'§c100'} width={100} height={12} />
          <Box label={'§c100'} width={100} height={12} />
        </Panel>
        <Text>{'§7expect: shrink to ~67 each (fits in 200)'}</Text>
      </Card>
      <Card title={'7b. shrink: 3 boxes of 100 in 200, shrink:0'}>
        <Panel flexDirection={'row'} width={200}>
          <Box label={'§c100'} width={100} height={12} flexShrink={0} />
          <Box label={'§c100'} width={100} height={12} flexShrink={0} />
          <Box label={'§c100'} width={100} height={12} flexShrink={0} />
        </Panel>
        <Text>{'§7expect: stay 100 each, OVERFLOW visible'}</Text>
      </Card>
      <Card title={'7c. shrink: weighted (1 vs 3)'}>
        <Panel flexDirection={'row'} width={100}>
          <Box label={'§cs1'} width={100} height={12} flexShrink={1} />
          <Box label={'§cs3'} width={100} height={12} flexShrink={3} />
        </Panel>
        <Text>{'§7expect: 75 / 25 (3x more shrink on right)'}</Text>
      </Card>
      {/* TEST 8: padding (numeric & percent)                                */}
      <Card title={'8a. padding=8'}>
        <Panel padding={8} width={200} height={30} flexDirection={'row'}>
          <Box label={'§a inner'} width={50} height={14} />
        </Panel>
        <Text>{'§7expect: child at x=8, y=8'}</Text>
      </Card>
      <Card title={'8b. padding=10% of parent width (304)'}>
        <Panel padding={'10%'} flexDirection={'row'}>
          <Box label={'§a inner'} width={50} height={14} />
        </Panel>
        <Text>{'§7expect: 10%x304=30 padding all sides'}</Text>
      </Card>
      {/* TEST 9: nested flex                                                */}
      <Card title={'9. nested: row -> column'}>
        <Panel flexDirection={'row'} width={300} gap={6}>
          <Panel flexDirection={'column'} flexGrow={1} gap={2}>
            <Box label={'§aL1'} height={12} />
            <Box label={'§aL2'} height={12} />
            <Box label={'§aL3'} height={12} />
          </Panel>
          <Panel flexDirection={'column'} flexGrow={1} gap={2}>
            <Box label={'§aR1'} height={12} />
            <Box label={'§aR2'} height={12} />
          </Panel>
        </Panel>
        <Text>{'§7expect: 2 columns, equal width, stretched cross-axis'}</Text>
      </Card>
      {/* TEST 10: column auto-height (content-derived)                      */}
      <Card title={'10. column with no height — derived from content'}>
        <Panel flexDirection={'column'} gap={3}>
          <Text>{'§aLine A'}</Text>
          <Text>{'§aLine B'}</Text>
          <Text>{'§aLine C'}</Text>
        </Panel>
        <Text>{'§7expect: card grows to fit 3 lines + 2 gaps'}</Text>
      </Card>
      {/* TEST 11: button intrinsic + padding                                */}
      <Card title={'11. button intrinsic + 8/4 padding inset'}>
        <Panel flexDirection={'row'} gap={6}>
          <Button>
            <Text>{'§aShort'}</Text>
          </Button>
          <Button>
            <Text>{'§aMuch longer label'}</Text>
          </Button>
        </Panel>
        <Text>{'§7expect: button bigger than text, text inset by 8/4'}</Text>
      </Card>
      {/* TEST 12: position absolute                                         */}
      <Card title={'12. position=absolute (overlay)'}>
        <Panel width={200} height={40}>
          <Box label={'§abg'} width={200} height={40} />
          <Panel position={'absolute'} top={5} left={5} width={30} height={20}>
            <Text>{'§ctop-left'}</Text>
          </Panel>
          <Panel position={'absolute'} bottom={5} right={5} width={30} height={20}>
            <Text>{'§cbot-right'}</Text>
          </Panel>
        </Panel>
        <Text>{'§7expect: 2 small panels overlaid on bg'}</Text>
      </Card>
    </Panel>
  );
}
