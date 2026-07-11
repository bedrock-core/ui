import { Button, Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Deterministic perf benchmark screen — fixed element counts so payload bytes are
 * identical across runs and builds can be compared frame-by-frame.
 *
 * StressDemo (pool mode): header (region 0) + 2 <Scroll> columns (the pool maximum)
 * + 1 static column rendered by region 0.
 * StressDemoFlat: identical content, no <Scroll> wrappers (root scroll only).
 *
 * Per column: 24 rows (bg panel + text, every 6th with shadow) + 6 buttons + 1 image.
 * (Panel+Text rows FOLD into single cells and background-less wrapper panels emit
 * nothing, so serialized cell counts are far below raw element counts.)
 */

const COLORS = ['§a', '§b', '§e'];
const NAMES = ['Alpha', 'Beta', 'Gamma'];
const ROWS = 24;
const BUTTONS = 6;

function Row({ label, shadow }: { label: string; shadow: boolean }): JSX.Element {
  return (
    <Panel padding={3} background={'textures/ui/recipe_book_group_expanded'}>
      <Text shadow={shadow}>{label}</Text>
    </Panel>
  );
}

function Column({ col }: { col: number }): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={3} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
      {[
        ...Array.from({ length: ROWS }, (_, i) => (
          <Row label={`${COLORS[col]}${NAMES[col]} row ${String(i + 1)}`} shadow={i % 6 === 5} />
        )),
        ...Array.from({ length: BUTTONS }, (_, i) => (
          <Button width={'100%'} height={16}>
            <Text>{`${COLORS[col]}Btn ${String(i + 1)}`}</Text>
          </Button>
        )),
        <Image width={24} height={24} texture={'textures/ui/recipe_book_group_collapsed'} />,
      ]}
    </Panel>
  );
}

function Header({ title }: { title: string }): JSX.Element {
  const exit = useExit();

  return (
    <Panel
      flexDirection={'row'}
      justifyContent={'space-between'}
      alignItems={'center'}
      width={'100%'}
      padding={4}
      background={'textures/ui/recipe_book_group_expanded'}
    >
      <Text font={'minecraftTen'}>{title}</Text>
      <Text shadow>{'§7fixed payload'}</Text>
      <Button width={20} height={16} onPress={(): void => exit()}>
        <Text>{'§cX'}</Text>
      </Button>
    </Panel>
  );
}

export function StressDemo(): JSX.Element {
  return (
    <Panel flexDirection={'column'} width={'100%'} height={'100%'}>
      <Header title={'§dStress (2 scrolls)'} />
      <Panel flexDirection={'row'} width={'100%'} flexGrow={1}>
        <Scroll><Column col={0} /></Scroll>
        <Scroll><Column col={1} /></Scroll>
        <Column col={2} />
      </Panel>
    </Panel>
  );
}

export function StressDemoFlat(): JSX.Element {
  return (
    <Panel flexDirection={'column'} width={'100%'} height={'100%'}>
      <Header title={'§dStress (no scrolls)'} />
      <Panel flexDirection={'row'} width={'100%'} flexGrow={1}>
        <Column col={0} />
        <Column col={1} />
        <Column col={2} />
      </Panel>
    </Panel>
  );
}
