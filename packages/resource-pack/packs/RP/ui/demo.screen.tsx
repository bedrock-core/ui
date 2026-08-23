/** @jsxImportSource @bedrock-core/ui */
import type { JSX } from '@bedrock-core/ui';
import { Panel, Text } from '@bedrock-core/ui';
import {
  Background,
  Button,
  Container,
  DynamicText,
  Hotbar,
  PlayerInventory,
  Progress,
  Slot,
} from '@bedrock-core/ui-runtime/compile';

/**
 * Everything a compiled container screen can currently do, on one screen.
 *
 * A compiled screen owns the WHOLE chest screen — 176 x 166, not the strip
 * above the player's inventory — so nothing appears unless it is asked for.
 * That is why `Background`, `PlayerInventory` and `Hotbar` are written out
 * below: delete them and they are gone. What is NOT optional is the functional
 * chrome (the dragged-item renderer, touch take-progress, the gamepad cursor);
 * the router emits that for every screen, compiled or not.
 *
 * Note what is still absent: no coordinates, no slot indices, no inventory size.
 * The flexbox pass places everything and the compiler allocates the slots.
 *
 * Slot roles are part of the LAYOUT, not the script: `input` refuses removals,
 * `output` refuses insertions, `both` is ordinary storage, and a `Button` is a
 * slot whose item the runtime owns so that taking it reads as a press. All of
 * it is undone a tick later rather than prevented — a container gives no way to
 * veto a move.
 */
export default function Demo(): JSX.Element {
  return (
    <Container>
      <Background />

      {/* Above the background on purpose: `common_panel` paints its own
          image at layer 1, which covers anything left at the default. Vanilla
          does the same thing — its chest content sits at layer 5. */}
      <Panel padding={4} gap={1} width={'100%'} zIndex={10}>
        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          {/* Static: baked at build time, so it may contain any character at
              all — including ones the runtime charset has no code for. */}
          <Text>{'§fBEDROCK CORE'}</Text>

          <Panel flexGrow={1} />

          <DynamicText name={'mode'} maxLength={8} />
        </Panel>

        {/* 28 characters is 28 container slots — the one cost here that scales
            with content. */}
        <DynamicText name={'status'} maxLength={28} />

        <Panel flexDirection={'row'} gap={3} alignItems={'center'}>
          {/* Not a built-in bar: a panel holding a whole image and a clipped
              one. Copy it, swap the textures, and it is a gauge instead. */}
          <Progress name={'charge'} flexGrow={1} />
          <DynamicText name={'level'} maxLength={6} />
        </Panel>

        <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
          <DynamicText name={'presses'} maxLength={5} />

          {/* Driven by a ticking interval rather than by a press, so the screen
              is visibly live while nobody is touching it. */}
          <DynamicText name={'uptime'} maxLength={7} />

          <DynamicText name={'last'} maxLength={12} />
        </Panel>

        <DynamicText name={'io'} maxLength={26} />

        <Panel flexDirection={'row'} gap={2} alignItems={'center'}>
          <Button name={'up'} />
          <Button name={'down'} />
          <Button name={'cycle'} />
          <Button name={'reset'} />

          <Panel flexGrow={1} />

          {/* Items go in and never come back out. */}
          <Slot name={'input'} role={'input'} />

          {/* Items may be taken and nothing put in. */}
          <Slot name={'output'} role={'output'} />

          {/* Ordinary storage, for comparison. */}
          <Slot name={'store'} role={'both'} />
        </Panel>
      </Panel>

      <PlayerInventory />
      <Hotbar />
    </Container>
  );
}
