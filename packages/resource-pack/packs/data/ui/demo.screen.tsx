/** @jsxImportSource @bedrock-core/ui */
import type { JSX } from '@bedrock-core/ui';
import { Panel, useState } from '@bedrock-core/ui';
import {
  Background,
  Button,
  Container,
  Hotbar,
  PlayerInventory,
  Progress,
  Slot,
  StaticText,
  Text,
} from '@bedrock-core/ui-runtime/compile';

/** The entity this screen opens from. The addon author picks it. */
export const entity = 'core:spike_container';

/**
 * A compiled container screen, written the way any other screen is written.
 *
 * Everything is here: the state, the handlers, the text. There is no second
 * file describing the same screen, and nothing is addressed by name — the build
 * runs this component once to decide the SHAPE, the runtime runs it again per
 * player to decide the VALUES, and the two walks line up position for position
 * because the shape cannot change.
 *
 * A screen owns the whole 176 x 166 chest screen, so nothing vanilla appears
 * unless it is asked for: delete `Background`, `PlayerInventory` or `Hotbar` and
 * they are gone. Only the functional chrome — the dragged-item renderer, touch
 * take-progress, the gamepad cursor — is always emitted, because without it
 * dragging and controllers break.
 *
 * Two costs worth knowing, both of them real rather than incidental:
 *
 *  - `<Text>` spends one container slot per character, because a slot publishes
 *    numbers and not strings. `maxLength` is the reservation.
 *  - a `<Button>` is a container slot with the item hidden, because a press
 *    reaches script only as an item move. It looks like a button because the
 *    face is ordinary JSON UI; the item underneath is pure transport.
 */
export default function Demo(): JSX.Element {
  const [charge, setCharge] = useState(0);
  const [mode, setMode] = useState(0);
  const [presses, setPresses] = useState(0);
  const [held, setHeld] = useState('nothing');

  const modes = ['idle', 'running', 'paused', 'done'];

  const press = (change: () => void) => (): void => {
    setPresses(count => count + 1);
    change();
  };

  return (
    <Container>
      <Background />

      {/* Above the background on purpose: `common_panel` paints its own image
          at layer 1, which covers anything left at the default. Vanilla does
          the same thing — its chest content sits at layer 5. */}
      <Panel padding={4} gap={2} width={'100%'} zIndex={10}>
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          {/* Baked into the layout, so it may use any character at all. */}
          <StaticText>{'§fBEDROCK CORE'}</StaticText>

          <Panel flexGrow={1} />

          <Text maxLength={8}>{modes[mode] ?? 'idle'}</Text>
        </Panel>

        <Text maxLength={26}>{`charge ${(charge * 100).toFixed(0)}.0 units`}</Text>

        <Panel flexDirection={'row'} gap={3} alignItems={'center'}>
          <Progress value={charge} flexGrow={1} />
          <Text maxLength={6}>{`${(charge * 100).toFixed(0)}.0`}</Text>
        </Panel>

        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <Text maxLength={10}>{`presses ${presses}`}</Text>
          <Text maxLength={16}>{`holding ${held}`}</Text>
        </Panel>

        <Panel flexDirection={'row'} gap={2} alignItems={'center'}>
          {/* Enabled exactly while it has a handler: at full charge `+` has
              none, stops reacting, and draws its disabled face — until `-`
              hands it a handler back. */}
          <Button
            disabledTexture={'textures/ui/disabledButton'}
            onPress={charge < 1 ? press(() => setCharge(value => Math.min(1, value + 0.25))) : undefined}
          >
            {'+'}
          </Button>

          <Button
            disabledTexture={'textures/ui/disabledButton'}
            onPress={charge > 0 ? press(() => setCharge(value => Math.max(0, value - 0.25))) : undefined}
          >
            {'-'}
          </Button>

          <Button onPress={press(() => setMode(value => (value + 1) % modes.length))}>
            {'>'}
          </Button>

          <Button
            texture={'textures/ui/button_borderless_dark'}
            hoverTexture={'textures/ui/button_borderless_darkhover'}
            pressedTexture={'textures/ui/button_borderless_darkpressed'}
            onPress={() => {
              setCharge(0);
              setMode(0);
              setPresses(0);
            }}
          >
            {'x'}
          </Button>

          <Panel flexGrow={1} />

          {/* Items go in and never come back out. */}
          <Slot
            role={'input'}
            onInsert={(_player, stack) => {
              setHeld(stack.typeId.replace('minecraft:', '').replaceAll('_', ' '));
            }}
          />

          {/* Items may be taken and nothing put in. */}
          <Slot role={'output'} onRemove={() => setHeld('nothing')} />

          {/* Ordinary storage, for comparison. */}
          <Slot />
        </Panel>
      </Panel>

      <PlayerInventory />
      <Hotbar />
    </Container>
  );
}
