import { Button } from '@bedrock-core/ore-styled';
import { DualScroll, Panel, Text, useExit, type JSX } from '@bedrock-core/ui';

/**
 * DualScroll demo — two independent vertical scroll regions.
 *
 * No widths are hardcoded: each column fills its region (DUAL_SCROLL_REGION_WIDTH),
 * so panels stretch and lay out against the real column width. The screen wrapper
 * renders `<DualScroll>` directly with no concrete element above the slots — required
 * so the region-aware layout pass can reach them.
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
    <DualScroll>
      <DualScroll.Left>
        <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
          {[
            <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
              <Text font={'minecraftTen'}>{'§bLeft'}</Text>
              <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
            </Panel>,
            ...left.map(label => <Row label={label} />),
          ]}
        </Panel>
      </DualScroll.Left>

      <DualScroll.Right>
        <Panel flexDirection={'column'} gap={4} padding={6} background={'textures/ui/recipe_book_group_expanded'}>
          {[
            <Text font={'minecraftTen'}>{'§eRight'}</Text>,
            ...right.map(label => <Row label={label} />),
          ]}
        </Panel>
      </DualScroll.Right>
    </DualScroll>
  );
}
