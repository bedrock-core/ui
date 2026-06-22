import { Button } from '@bedrock-core/ore-styled';
import { Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Dual scroll demo — two side-by-side vertical scrolls.
 *
 * The outer Panel is fixed to the full viewport height (flexDirection row) so the MAIN
 * scroll has nothing to scroll; the two `<Scroll>` children become extra scrolls 1 and 2,
 * flex-positioned as equal columns. Each scrolls independently.
 */
function Row({ label }: { label: string }): JSX.Element {
  return (
    <Panel padding={3} background={'textures/ui/recipe_book_group_expanded'}>
      <Text>{label}</Text>
    </Panel>
  );
}

export function DualScrollDemo(): JSX.Element {
  const exit = useExit();

  const left = Array.from({ length: 30 }, (_, i) => `§a${`Left row ${String(i + 1)}`}`);
  const right = Array.from({ length: 30 }, (_, i) => `§b${`Right row ${String(i + 1)}`}`);

  return (
    <Panel flexDirection={'row'} width={'100%'} height={'100%'} gap={4}>
      <Image texture={'textures/ui/recipe_book_group_collapsed'} width={32} height={32} />
      <Scroll x={0} y={0} width={200} height={120}>
        <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
          {[
            <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
              <Text font={'minecraftTen'}>{'§bLeft'}</Text>
              <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
            </Panel>,
            ...left.map(label => <Row label={label} />),
          ]}
        </Panel>
      </Scroll>

      <Scroll x={60} y={60} width={200} height={120}>
        <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
          {[
            <Text font={'minecraftTen'}>{'§eRight'}</Text>,
            ...right.map(label => <Row label={label} />),
          ]}
        </Panel>
      </Scroll>
    </Panel>
  );
}
