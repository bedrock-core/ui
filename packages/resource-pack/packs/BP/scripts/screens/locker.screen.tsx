/** @jsxImportSource @bedrock-core/ui */
import { Button, Card, theme } from '@bedrock-core/ore-styled';
import {
  Container, Hotbar, Panel, PlayerInventory, Slot, Text, useExit, useState, type JSX,
} from '@bedrock-core/ui';

/**
 * A locker: nine slots of storage on a chest screen, beside the player's own
 * inventory.
 *
 * Every slot is the screen's — the build hands each one its place in the
 * entity's inventory, and the runtime reports what moves through it — and
 * the two lines under the grid are live text: one slot per character.
 */

const { spacing } = theme.tokens;

const CELL = 18;
const COLUMNS = 3;
const ROWS = 3;
/** The card: the grid, and room for the longest line under it. */
const CARD_WIDTH = 104;
const LINE_MAX = 14;

const ICON_CLOSE = 'textures/ui/close_button_default';
const ICON_CLOSE_HOVER = 'textures/ui/close_button_hover';
const ICON_CLOSE_PRESSED = 'textures/ui/close_button_pressed';

export default function Locker(): JSX.Element {
  const [stacks, setStacks] = useState(0);
  const [visitor, setVisitor] = useState('');
  const exit = useExit();

  return (
    <Container
      entity={'core:locker'}
      flexDirection={'row'}
      padding={spacing.sm}
      gap={spacing.md}
      background={'textures/ui/dialog_background_opaque'}
      onOpen={({ player }): void => setVisitor(player.name)}
      onClose={(): void => setVisitor('')}
    >
      <Card variant={'raised'} width={CARD_WIDTH} flexDirection={'column'} gap={spacing.sm} padding={spacing.md}>
        <Panel flexDirection={'row'} alignItems={'center'}>
          <Text shadow={true}>{'Locker'}</Text>
          <Panel flexGrow={1} />
          <Button
            variant={'transparent'}
            width={14}
            height={14}
            background={ICON_CLOSE}
            backgroundHover={ICON_CLOSE_HOVER}
            backgroundPressed={ICON_CLOSE_PRESSED}
            onPress={exit}
          />
        </Panel>
        <Panel flexDirection={'row'} wrap={'wrap'} width={COLUMNS * CELL}>
          {Array.from({ length: COLUMNS * ROWS }, (_, index) => (
            <Panel key={index} width={CELL} height={CELL} background={'textures/ui/slot_enabled'}>
              <Slot
                onInsert={(): void => setStacks(count => count + 1)}
                onRemove={(): void => setStacks(count => Math.max(0, count - 1))}
              />
            </Panel>
          ))}
        </Panel>
        <Panel flexGrow={1} />
        <Text maxLength={LINE_MAX}>{`${String(stacks)} stacks`}</Text>
        <Text maxLength={LINE_MAX} color={[0.7, 0.7, 0.7]}>{visitor}</Text>
      </Card>
      <Panel flexDirection={'column'} justifyContent={'flex-end'} gap={spacing.sm}>
        <PlayerInventory />
        <Hotbar />
      </Panel>
    </Container>
  );
}
