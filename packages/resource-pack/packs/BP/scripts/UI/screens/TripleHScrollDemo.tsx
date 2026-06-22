import { Button } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Triple horizontal scroll demo — three `<Scroll axis="x">` rows stacked vertically
 * (the default column flow). Each row's cells use explicit widths so the content
 * overflows horizontally and the row scrolls on X.
 */
function Cell({ label }: { label: string }): JSX.Element {
  return (
    <Panel width={56} height={'100%'} padding={3} background={'textures/ui/recipe_book_group_expanded'}>
      <Text>{label}</Text>
    </Panel>
  );
}

const COLORS = ['§a', '§b', '§e'];

export function TripleHScrollDemo(): JSX.Element {
  const exit = useExit();

  return (
    <>
      {[0, 1, 2].map(row => (
        <Scroll axis={'x'}>
          <Panel flexDirection={'row'} gap={4} padding={4} background={'textures/ui/recipe_book_group_expanded'}>
            {[
              row === 0
                ? <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
                : <Panel />,
              ...Array.from({ length: 12 }, (_, i) => (
                <Cell label={`${COLORS[row]}R${String(row)}·${String(i + 1)}`} />
              )),
            ]}
          </Panel>
        </Scroll>
      ))}
    </>
  );
}
