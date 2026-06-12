import { Button } from '@bedrock-core/ore-styled';
import { Panel, Screen, Text, useExit, useSetScreen, type JSX } from '@bedrock-core/ui';

/**
 * ScrollScreen demo — the default scrolling form.
 * Enough rows are emitted to overflow the viewport so the scrollbar actually engages.
 */
function EntryRow({ label, desc }: { label: string; desc: string }): JSX.Element {
  return (
    <Panel
      flexDirection={'row'}
      gap={6}
      alignItems={'center'}
      padding={4}
      background={'textures/ui/recipe_book_group_expanded'}
    >
      <Text font={'minecraftTen'}>{label}</Text>
      <Text>{`§7${desc}`}</Text>
    </Panel>
  );
}

function ScrollContent(): JSX.Element {
  const exit = useExit();

  return (
    <Panel flexDirection={'column'} gap={6} padding={8} background={'textures/ui/recipe_book_group_expanded'}>
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§b§lScroll Screen'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>

      <Text>{'§7Scroll down — all rows must track the content:'}</Text>

      <EntryRow label={'§aHooks'} desc={'useState · useEffect · useReducer · useRef'} />
      <EntryRow label={'§bFlex'} desc={'row · column · wrap · gap · padding · align'} />
      <EntryRow label={'§eFonts'} desc={'minecraftTen · minecraftSeven · smooth'} />
      <EntryRow label={'§dButtons'} desc={'primary · secondary · contrast · disabled'} />
      <EntryRow label={'§cPanels'} desc={'background · border · clip · overflow'} />
      <EntryRow label={'§6Navigation'} desc={'stack navigator · back bar · screen types'} />
      <EntryRow label={'§3Text'} desc={'scale · overflow · word-break · color codes'} />
      <EntryRow label={'§5Images'} desc={'texture · tint · nine-slice · aspect ratio'} />
      <EntryRow label={'§2Dividers'} desc={'default · light · full-width variants'} />
      <EntryRow label={'§1Cards'} desc={'ore-styled card with padding and shadow'} />

      <Text>{'§7End of list — only visible after scrolling.'}</Text>
    </Panel>
  );
}

export function ScrollDemo(): JSX.Element {
  useSetScreen(Screen.Scroll);

  return <ScrollContent />;
}
