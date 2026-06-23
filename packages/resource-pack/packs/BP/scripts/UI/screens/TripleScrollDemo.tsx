import { Button } from '@bedrock-core/ore-styled';
import { Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Triple scroll demo — three independent scrolls laid out in a 2×2 grid, with an image in
 * the fourth cell. Two row `<Panel>`s (each flexGrow 1 → half height) hold two cells each;
 * the three `<Scroll>`s become pooled scrolls (indices 1–3) and the image is region-0
 * content rendered by the root scroll. Proves the pool positions multiple scrolls anywhere
 * the layout puts them, alongside ordinary (non-scroll) content.
 */
function Row({ label }: { label: string }): JSX.Element {
  return (
    <Panel padding={3} background={'textures/ui/recipe_book_group_expanded'}>
      <Text>{label}</Text>
    </Panel>
  );
}

const COLORS = ['§a', '§b', '§e'];
const NAMES = ['Top-left', 'Top-right', 'Bottom-left'];

function Column({ col, onClose }: { col: number; onClose?: () => void }): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
      {[
        <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
          <Text font={'minecraftTen'}>{`${COLORS[col]}${NAMES[col]}`}</Text>
          {onClose ? <Button variant={'secondary'} onPress={onClose}>{'§7X'}</Button> : <Panel />}
        </Panel>,
        ...Array.from({ length: 25 }, (_, i) => (
          <Row label={`${COLORS[col]}${NAMES[col]} ${String(i + 1)}`} />
        )),
      ]}
    </Panel>
  );
}

export function TripleScrollDemo(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} width={'100%'} height={'100%'} gap={4}>
      <Panel flexDirection={'row'} width={'100%'} flexGrow={1} gap={4}>
        <Scroll><Column col={0} /></Scroll>
        <Scroll><Column col={1} /></Scroll>
      </Panel>

      <Panel flexDirection={'row'} width={'100%'} flexGrow={1} gap={4}>
        <Scroll><Column col={2} onClose={exit} /></Scroll>
        <Panel
          flexGrow={1}
          alignItems={'center'}
          justifyContent={'center'}
          background={'textures/ui/recipe_book_group_expanded'}
        >
          <Image texture={'textures/ui/recipe_book_group_collapsed'} width={48} height={48} />
        </Panel>
      </Panel>
    </Panel>
  );
}
