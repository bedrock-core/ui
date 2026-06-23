import { Button } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Dual scroll demo (mode 2 — custom scrolls). A fixed full-height row holds two `<Scroll>`
 * columns that scroll independently; region-0 content (here just the title row) fits, so the
 * root scroll doesn't scroll. For the root-scroll (mode 1) behaviour see a no-`<Scroll>`
 * screen with tall content.
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

  const left = Array.from({ length: 30 }, (_, i) => `§aLeft ${String(i + 1)}`);
  const right = Array.from({ length: 30 }, (_, i) => `§bRight ${String(i + 1)}`);

  return (
    <Panel flexDirection={'row'} width={'100%'} height={'100%'} gap={4}>
      <Scroll>
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

      <Scroll>
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
