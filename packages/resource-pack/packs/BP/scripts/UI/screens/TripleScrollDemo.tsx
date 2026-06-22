import { Button } from '@bedrock-core/ore-styled';
import { Panel, Scroll, ScrollArea, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Triple scroll demo — three side-by-side vertical scrolls via `<ScrollArea
 * direction="row">` with three `<Scroll>` children (indices 0–2), each independent.
 */
function Row({ label }: { label: string }): JSX.Element {
  return (
    <Panel padding={3} background={'textures/ui/recipe_book_group_expanded'}>
      <Text>{label}</Text>
    </Panel>
  );
}

const COLORS = ['§a', '§b', '§e'];
const NAMES = ['Left', 'Middle', 'Right'];

export function TripleScrollDemo(): JSX.Element {
  const exit = useExit();

  return (
    <ScrollArea direction={'row'}>
      {[0, 1, 2].map(col => (
        <Scroll>
          <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
            {[
              <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
                <Text font={'minecraftTen'}>{`${COLORS[col]}${NAMES[col]}`}</Text>
                {col === 2 ? <Button variant={'secondary'} onPress={exit}>{'§7X'}</Button> : <Panel />}
              </Panel>,
              ...Array.from({ length: 25 }, (_, i) => (
                <Row label={`${COLORS[col]}${NAMES[col]} ${String(i + 1)}`} />
              )),
            ]}
          </Panel>
        </Scroll>
      ))}
    </ScrollArea>
  );
}
