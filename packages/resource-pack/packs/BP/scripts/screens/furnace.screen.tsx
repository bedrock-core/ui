import { EntityComponentTypes, ItemStack } from '@minecraft/server';
import { Button, Card } from '@bedrock-core/ore-styled';
import type { JSX } from '@bedrock-core/ui';
import {
  Container,
  Hotbar,
  Image,
  Panel,
  PlayerInventory,
  Scroll,
  Slot,
  Text,
  useExit,
  useState,
} from '@bedrock-core/ui';

const MODES = ['idle', 'running', 'paused', 'done'] as const;

/** Vanilla item textures, for a gallery long enough to need the scroll. */
const ITEMS = ['apple', 'bread', 'coal', 'diamond', 'emerald', 'gold_ingot', 'iron_ingot', 'stick', 'apple', 'bread', 'coal', 'diamond', 'emerald', 'gold_ingot', 'iron_ingot', 'stick'] as const;

/**
 * A container screen, written the way any other screen is written.
 *
 * Everything is here: the state, the handlers, the text. There is no second
 * file describing the same screen, and nothing is addressed by name — the build
 * runs this component once to decide the SHAPE, the runtime runs it again per
 * render to decide the VALUES, and the two walks line up position for position
 * because the shape cannot change.
 *
 * A screen owns the whole chest screen, so nothing vanilla appears unless it is
 * asked for: drop `PlayerInventory` or `Hotbar` and they are gone.
 *
 * Costs worth knowing, all real rather than incidental:
 *
 *  - `<Text maxLength>` spends one container slot per character, because a
 *    slot publishes numbers and not strings. Text without it is baked into the
 *    layout and may use any character at all.
 *  - a `<Button>` is a container slot with the item hidden, because a press
 *    reaches script only as an item move. It looks like a button because the
 *    face is ordinary JSON UI; the item underneath is pure transport.
 */
export default function Furnace(): JSX.Element {
  const [charge, setCharge] = useState(0);
  const [mode, setMode] = useState(0);
  const [held, setHeld] = useState('nothing');
  const [viewer, setViewer] = useState('nobody');
  // In a container this is the press that becomes the screen's close button:
  // the client closes the screen, exactly as vanilla's own X does.
  const exit = useExit();

  return (
    <Container
      entity={'core:furnace'}
      flexDirection={'row'}
      padding={8}
      gap={8}
      background={'textures/ui/dialog_background_opaque'}
      onOpen={({ player }) => setViewer(player.name)}
      onClose={() => setViewer('nobody')}
    >
      {/* A gallery taller than the screen: the region scrolls on the client
          while the layout stays frozen. */}
      <Scroll width={110}>
        <Panel flexDirection={'column'} gap={4} padding={2}>
          <Text>{'§7Items'}</Text>

          <Panel flexDirection={'column'} gap={4}>
            {ITEMS.map(item => (
              <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
                <Image width={16} height={16} texture={`textures/items/${item}`} />
                <Text>{item.replaceAll('_', ' ')}</Text>
              </Panel>
            ))}
          </Panel>

          {/* The raw-collection API: a display-only peek at the player's first
              hotbar item, read straight from the `hotbar_items` collection. It
              takes no slot of the furnace's own container, and the runtime never
              polls it — `interactive={false}` keeps it inert. */}
          <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
            <Text>{'§7hotbar[0]'}</Text>
            <Slot collection={'hotbar_items'} index={0} interactive={false} />
          </Panel>
        </Panel>
      </Scroll>

      <Panel flexDirection={'column'} gap={6} flexGrow={1} alignItems={'flex-end'}>
        <Card width={'100%'}>
          <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
            <Text>{'§fBEDROCK CORE'}</Text>

            <Panel flexGrow={1} />

            <Text maxLength={8}>{MODES[mode % MODES.length]}</Text>
          </Panel>

          <Text maxLength={12}>{`charge ${Math.round(charge * 100)}`}</Text>
          <Text maxLength={24}>{`holding ${held}`}</Text>
          <Text maxLength={24}>{`viewer ${viewer}`}</Text>

          <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
            <Button
              enabled={charge < 1}
              onPress={() => setCharge(value => Math.min(1, value + 0.25))}
            >
              {'+'}
            </Button>

            <Button
              enabled={charge > 0}
              onPress={() => setCharge(value => Math.max(0, value - 0.25))}
            >
              {'-'}
            </Button>

            <Button
              variant={'secondary'}
              onPress={() => setMode(value => value + 1)}
            >
              {'>'}
            </Button>

            <Panel flexGrow={1} />

            {/* Items go in and never come back out. The panel is just the slot
                texture: a raw slot draws only its item. `flexShrink={0}` keeps
                the texture at cell size when the row runs out of width. */}
            <Panel background={'textures/ui/slot_enabled'} flexShrink={0}>
              <Slot role={'input'} />
            </Panel>

            {/* Items may be taken and nothing put in. */}
            <Panel background={'textures/ui/slot_enabled'} flexShrink={0}>
              <Slot role={'output'} />
            </Panel>

            {/* Ordinary storage: whatever sits here is what the screen says it holds. */}
            <Panel background={'textures/ui/slot_enabled'} flexShrink={0}>
              <Slot
                onInsert={({ stack }) => {
                  setHeld(stack.typeId.replace('minecraft:', '').replaceAll('_', ' '));
                }}
                onRemove={({ stack }) => {
                  setHeld(`took ${stack.typeId.replace('minecraft:', '').replaceAll('_', ' ')}`);
                }}
              />
            </Panel>

            {/* A stand-in for the machine: writes a result over the output's
                guard, the way real smelting logic would. The output is the 5th
                drawn cell — three buttons, the input, then it — at container
                index 6, after the two sentinel slots; writing into it is how
                machinery fills an output, and the poll sees the result appear
                where no player can reach and lets it stand. */}
            <Button
              variant={'secondary'}
              onPress={({ host }) => {
                host?.getComponent(EntityComponentTypes.Inventory)?.container?.setItem(6, new ItemStack('minecraft:iron_ingot', 4));
              }}
            >
              {'smelt'}
            </Button>
          </Panel>

          {/* Drawn after everything else in the card, so it sits on top of it. */}
          <Button
            variant={'transparent'}
            width={14}
            height={14}
            position={'absolute'}
            top={4}
            right={4}
            background={'textures/ui/close_button_default'}
            backgroundHover={'textures/ui/close_button_hover'}
            backgroundPressed={'textures/ui/close_button_pressed'}
            onPress={exit}
          />
        </Card>

        <Panel flexGrow={1} />

        <PlayerInventory />
        <Hotbar marginTop={4} />
      </Panel>
    </Container>
  );
}
