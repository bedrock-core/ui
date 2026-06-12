import { Button, Divider } from '@bedrock-core/ore-styled';
import { Panel, Screen, Text, useExit, useSetScreen, type JSX } from '@bedrock-core/ui';

/**
 * FixedScreen demo — a single, non-scrolling page.
 * Demonstrates fixed-layout controls: buttons, text, and panel arrangements.
 */
function FixedContent(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8} background={'textures/ui/recipe_book_group_expanded'}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§b§lFixed Screen'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>

      <Text>{'§7Non-scrolling layout — controls share one fixed coordinate space.'}</Text>

      <Divider />

      <Panel flexDirection={'row'} gap={4}>
        <Button>{'§aPrimary'}</Button>
        <Button variant={'secondary'}>{'§bSecondary'}</Button>
        <Button variant={'contrast'}>{'§eContrast'}</Button>
      </Panel>

      <Divider variant={'light'} />

      <Panel flexDirection={'column'} gap={2}>
        <Text font={'minecraftTen'} scale={2}>{'§6Large heading'}</Text>
        <Text>{'§7Body text at default scale. Color codes and formatting work here.'}</Text>
        <Text>{'§8Small caption at default scale.'}</Text>
      </Panel>
    </Panel>
  );
}

export function FixedDemo(): JSX.Element {
  useSetScreen(Screen.Fixed);

  return <FixedContent />;
}
