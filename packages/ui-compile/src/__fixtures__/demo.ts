import type { IrDocument } from '../ir';

/**
 * A screen exercising every node kind the emitter can produce: a title, a fill
 * clipped by a bank slot nothing draws, a button slot, a row of eight, and a
 * vanilla control asked for by name.
 *
 * Shared by the emitter tests and by `scripts/emit-demo.ts`, which writes the
 * result into the reference pack. That is the point of sharing it — the JSON UI
 * that ships is the emitter's own output, so the golden test and the in-game
 * check are testing the same bytes.
 *
 * Rects are what the flexbox pass will solve for:
 *
 *   <Panel flexDirection={'column'} gap={4} padding={7}>
 *     <Text>…</Text>
 *     <Panel flexDirection={'row'} gap={4} alignItems={'center'}>
 *       <Progress name={'charge'} flexGrow={1} />
 *       <Slot.Button name={'toggle'} />
 *     </Panel>
 *     <SlotGrid name={'bay'} rows={1} cols={8} />
 *   </Panel>
 *
 * Canvas is the vanilla chest top half: 176 x 83, origin at its top left.
 */
export const demoScreen: IrDocument = {
  namespace: 'bcui_demo',
  collection: 'container_items',
  entry: 'screen',
  // Nine drawn slots after the sentinel, one channel in the bank behind them.
  // Written out here because the fixture is hand-built; a real screen gets this
  // from `toIr`, which hands the indices out itself.
  allocation: { sentinel: 0, drawn: 9, channels: 1, size: 11 },
  root: {
    kind: 'panel',
    name: 'canvas',
    rect: { x: 0, y: 0, width: 176, height: 83 },
    children: [
      {
        kind: 'label',
        name: 'title',
        rect: { x: 7, y: 4, width: 162, height: 10 },
        text: '§fCompiled screen — emitted by @bedrock-core/ui-compile',
        shadow: true,
      },
      {
        kind: 'image',
        name: 'track',
        rect: { x: 7, y: 20, width: 110, height: 6 },
        texture: 'textures/ui/brewing_fuel_bar_empty',
      },
      {
        kind: 'image',
        name: 'fill',
        rect: { x: 7, y: 20, width: 110, height: 6 },
        texture: 'textures/ui/brewing_fuel_bar_full',
        channel: 10,
        direction: 'left',
      },
      {
        kind: 'ref',
        name: 'player_inventory',
        rect: { x: 0, y: 60, width: 176, height: 0 },
        ref: 'common.inventory_panel_bottom_half_with_label',
        sized: false,
      },
      {
        kind: 'slot',
        name: 'toggle',
        rect: { x: 151, y: 14, width: 18, height: 18 },
        slot: 1,
        role: 'button',
      },
      ...Array.from({ length: 8 }, (_, i) => ({
        kind: 'slot' as const,
        name: `bay_${i}`,
        rect: { x: 7 + i * 18, y: 40, width: 18, height: 18 },
        slot: 2 + i,
        role: 'both' as const,
      })),
    ],
  },
};
