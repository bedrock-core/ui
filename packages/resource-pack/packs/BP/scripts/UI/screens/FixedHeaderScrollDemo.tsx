import { Button } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * Header + body demo — a short top scroll whose content fits (so it acts as a fixed
 * header that never scrolls) above a tall body scroll. Two stacked vertical `<Scroll>`s
 * in the default column flow: the header fixes its height, the body fills the rest.
 */
function Row({ label }: { label: string }): JSX.Element {
  return (
    <Panel padding={3} background={'textures/ui/recipe_book_group_expanded'}>
      <Text>{label}</Text>
    </Panel>
  );
}

export function FixedHeaderScrollDemo(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} width={'100%'} height={'100%'}>
      <Panel
        height={30}
        flexDirection={'row'}
        justifyContent={'space-between'}
        alignItems={'center'}
        padding={6}
        background={'textures/ui/recipe_book_group_expanded'}
      >
        <Text font={'minecraftTen'}>{'§dFixed Header'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>
      <Scroll>
        <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
          {Array.from({ length: 30 }, (_, i) => (
            <Row label={`§bScrolling row ${String(i + 1)}`} />
          ))}
        </Panel>
      </Scroll>
    </Panel>
  );
}
