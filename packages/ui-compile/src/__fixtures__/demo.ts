import type { IrDocument } from '../ir';

/**
 * A screen exercising every node kind the emitter can produce: a shadowed
 * title, a translation key, a live text run, a track image,
 * two buttons with a baked caption each, a locked, an input and an ordinary
 * slot, a static item
 * icon, and the player's own grids asked for by name.
 *
 * Shared by the emitter tests and the artifact test, so the JSON UI the tests
 * assert on is the emitter's own output rather than something typed by hand.
 *
 * Rects are what the flexbox pass solves for:
 *
 *   <Container entity={'core:demo'} background={…} padding={7} gap={4}>
 *     <Background texture={…} />
 *     <Text shadow font={'minecraftTen'}>{'§fBEDROCK CORE'}</Text>
 *     <Text>{'core.demo.subtitle'}</Text>
 *     <Text maxLength={8}>{mode}</Text>
 *     <Panel zIndex={2}>
 *       <Image texture={track} />
 *     </Panel>
 *     <Panel flexDirection={'row'} gap={4}>
 *       <Button backgroundLocked={…}>{'+'}</Button>
 *       <Button backgroundLocked={…}>{'-'}</Button>
 *     </Panel>
 *     <Panel flexDirection={'row'} gap={4}>
 *       <Slot interactive={false} /> <Slot role={'input'} /> <Slot />
 *     </Panel>
 *     <PlayerInventory /> <Hotbar />
 *   </Container>
 *
 * Canvas is the canonical screen: 320 x 210, origin at its top left.
 */
/** What the chest's compiler would report for this screen; the document no longer carries it. */
export const demoCounts = { sentinels: 2, drawn: 5, channels: 8, size: 15 } as const;

/** The entity this screen would open from. Also the compiler's, not the document's. */
export const demoEntity = 'core:demo';

export const demoScreen: IrDocument = {
  namespace: 'core_ui_demo',
  collection: 'container_items',
  ownedItemRenderer: 'core_ui_chest.gated_item',
  backdrop: 'textures/ui/demo_backdrop',
  root: {
    kind: 'panel',
    name: 'root',
    rect: { x: 0, y: 0, width: 320, height: 210 },
    background: 'textures/ui/dialog_background_opaque',
    children: [
      {
        kind: 'label',
        name: 'label_1',
        rect: { x: 7, y: 7, width: 120, height: 10 },
        text: '§fBEDROCK CORE',
        localize: false,
        fontType: 'MinecraftTen',
        fontScaleFactor: 2,
        shadow: true,
      },
      {
        kind: 'label',
        name: 'label_2',
        rect: { x: 7, y: 21, width: 90, height: 10 },
        visible: false,
        text: 'core.demo.subtitle',
        localize: true,
        fontType: 'default',
        fontScaleFactor: 2,
      },
      {
        kind: 'text',
        name: 'text_1',
        rect: { x: 7, y: 35, width: 48, height: 10 },
        address: 7,
        length: 8,
        fontType: 'default',
        fontScaleFactor: 2,
      },
      {
        kind: 'panel',
        name: 'panel_1',
        rect: { x: 7, y: 49, width: 306, height: 6 },
        layer: 2,
        children: [
          {
            kind: 'image',
            name: 'image_1',
            rect: { x: 0, y: 0, width: 306, height: 6 },
            texture: 'textures/ui/brewing_fuel_bar_empty',
          },
        ],
      },
      {
        kind: 'panel',
        name: 'panel_2',
        rect: { x: 7, y: 59, width: 306, height: 20 },
        children: [
          {
            kind: 'button',
            name: 'button_1',
            rect: { x: 0, y: 0, width: 60, height: 20 },
            address: 2,
            face: {
              texture: 'textures/ui/button_borderless_light',
              hover: 'textures/ui/button_borderless_lighthover',
              pressed: 'textures/ui/button_borderless_lightpressed',
              disabled: 'textures/ui/disabledButton',
            },
            children: [
              {
                kind: 'label',
                name: 'label_3',
                rect: { x: 26, y: 5, width: 8, height: 10 },
                text: '+',
                localize: false,
                fontType: 'default',
                fontScaleFactor: 2,
              },
            ],
          },
          {
            kind: 'button',
            name: 'button_2',
            rect: { x: 64, y: 0, width: 60, height: 20 },
            address: 3,
            face: {
              texture: 'textures/ui/button_borderless_light',
              hover: 'textures/ui/button_borderless_lighthover',
              pressed: 'textures/ui/button_borderless_lightpressed',
              disabled: 'textures/ui/disabledButton',
            },
            children: [
              {
                kind: 'label',
                name: 'label_4',
                rect: { x: 26, y: 5, width: 8, height: 10 },
                text: '-',
                localize: false,
                fontType: 'default',
                fontScaleFactor: 2,
              },
            ],
          },
        ],
      },
      {
        kind: 'panel',
        name: 'panel_3',
        rect: { x: 7, y: 83, width: 306, height: 18 },
        children: [
          { kind: 'slot', name: 'slot_1', rect: { x: 0, y: 0, width: 18, height: 18 }, address: 4, role: 'both', interactive: false },
          { kind: 'slot', name: 'slot_2', rect: { x: 22, y: 0, width: 18, height: 18 }, address: 5, role: 'input', interactive: true },
          { kind: 'slot', name: 'slot_3', rect: { x: 44, y: 0, width: 18, height: 18 }, address: 6, role: 'both', interactive: true },
        ],
      },
      {
        kind: 'grid',
        name: 'grid_1',
        rect: { x: 79, y: 125, width: 162, height: 54 },
        collection: 'inventory_items',
        columns: 9,
        rows: 3,
        interactive: true,
        hideOwned: true,
      },
      {
        kind: 'grid',
        name: 'grid_2',
        rect: { x: 79, y: 183, width: 162, height: 18 },
        collection: 'hotbar_items',
        columns: 9,
        rows: 1,
        interactive: true,
        hideOwned: true,
      },
    ],
  },
};
