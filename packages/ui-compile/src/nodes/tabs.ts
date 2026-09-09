import { TAB_SLOT_TYPE, TABS_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import type { Control, ControlEntry } from '../jsonui';
import { FACE_CONTENT_LAYER, FONT_SIZE, FULL, layerOf, num, offsetOf, sizeOf, str, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition, Rect } from './types';

/**
 * Tabs: several panes on one screen, switched entirely on the client.
 *
 * MEASURED (spike S4): a radio toggle group swaps its content with NOTHING
 * reaching script, on the pack's own form mount and under the
 * modification-inserted chest mount alike. So this emits a toggle group, and a
 * tab change costs no press, no re-present and no payload.
 *
 * Two rules from that spike are not optional here, and both were learned by
 * getting them wrong first:
 *
 *  - ALL EIGHT state controls. A toggle draws the one its current state names
 *    and nothing else, so a state left undefined is a control that vanishes the
 *    moment the pointer touches it.
 *  - `toggle_on_button` / `toggle_off_button` and the button mappings, without
 *    which the toggle draws but never takes a press.
 *
 * ## Why the pane lives inside the toggle
 *
 * A pane is a child of its tab's CHECKED state rather than a sibling gated on
 * the state. That is what keeps the group client-only: nothing outside the
 * toggle has to observe which tab is open, so nothing has to be told when it
 * changes. It is the same rule a button's caption obeys — a control draws the
 * child its state names, and nothing else of its own.
 */
export interface TabNode extends NodeBase {
  kind: 'tab';
  label: string;
  /** Face when this tab is not the chosen one. */
  face: string;
  /** Face when it is. */
  faceSelected: string;
  children: IrNode[];
}

export interface TabsNode extends NodeBase {
  kind: 'tabs';
  /** Height of the header row; the panes take what is left. */
  tabHeight: number;
  tabs: TabNode[];
}

declare module './types' {
  interface IrNodeMap {
    tabs: TabsNode;
    tab: TabNode;
  }
}

/** A pane's children are solved from the pane's own top-left. */
const PANE_ORIGIN: Rect = { x: 0, y: 0, width: 0, height: 0 };

const UNSTYLED = 'textures/ui/unstyled';

/**
 * One state of one tab: the face, and the header caption over it.
 *
 * `pane` is present only on the checked states. That asymmetry IS the feature:
 * the content exists in the tree exactly when its tab is the chosen one, and no
 * binding anywhere reads which that is.
 */
const state = (texture: string, caption: string, pane: string | undefined): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [
    { bg: { type: 'image', texture, size: FULL, keep_ratio: false, layer: 1 } },
    {
      caption: {
        type: 'label',
        size: FULL,
        ...topLeft,
        text: caption,
        localize: false,
        font_size: FONT_SIZE,
        layer: FACE_CONTENT_LAYER,
      },
    },
    ...pane === undefined ? [] : [{ [`pane@${pane}`]: {} } satisfies ControlEntry],
  ],
});

export const tabDefinition: NodeDefinition<TabNode> = {
  kind: 'tab',
  types: [TAB_SLOT_TYPE],

  children: node => node.children,

  lower(element, _type, ctx): TabNode {
    const background = str(element.props.background) ?? UNSTYLED;

    return {
      kind: 'tab',
      name: ctx.name('tab'),
      rect: ctx.rect,
      ...ctx.decoration,
      label: str(element.props.label) ?? '',
      face: background,
      faceSelected: str(element.props.backgroundSelected) ?? background,
      children: ctx.children(element, PANE_ORIGIN),
    };
  },

  // A pane never emits on its own: it is emitted by its group, inside the
  // checked states of its tab's toggle. Reaching here means a `<Tabs.Tab>` was
  // written outside a `<Tabs>`.
  face(node) {
    return { [node.name]: { type: 'panel', size: sizeOf(node.rect), ...topLeft } };
  },
};

export const tabsDefinition: NodeDefinition<TabsNode> = {
  kind: 'tabs',
  types: [TABS_SLOT_TYPE],

  children: node => node.tabs,

  lower(element, _type, ctx): TabsNode {
    const lowered = ctx.children(element, ctx.own);

    return {
      kind: 'tabs',
      name: ctx.name('tabs'),
      rect: ctx.rect,
      ...ctx.decoration,
      tabHeight: num(element.props.tabHeight) ?? 20,
      tabs: lowered.filter((child): child is TabNode => child.kind === 'tab'),
    };
  },

  face(node, ctx): ControlEntry {
    const { tabs, tabHeight } = node;
    const width = tabs.length === 0 ? node.rect.width : Math.floor(node.rect.width / tabs.length);

    const headers: ControlEntry[] = tabs.map((tab, index): ControlEntry => {
      // The pane is a definition of its own so both checked states can name it
      // without emitting it twice. Its offset is relative to the TOGGLE, since
      // that is what contains it — the pane's own rect is in screen space.
      const pane = `${tab.name}_pane`;

      ctx.defs[pane] = {
        type: 'panel',
        size: sizeOf(tab.rect),
        // Relative to the TOGGLE that contains it.
        //
        // Both rects are in the GROUP's space — `ctx.children(element,
        // ctx.own)` solves a child from its parent's origin — and the toggle
        // sits at `(index * width, 0)` in that same space. Subtracting an
        // ABSOLUTE header x here mixed two coordinate spaces and shifted every
        // pane by the group's own position.
        offset: [tab.rect.x - index * width, tab.rect.y],
        ...topLeft,
        controls: tab.children.map(child => ctx.emitNode(child)),
      };

      const paneRef = `${ctx.ns}.${pane}`;
      const on = tab.faceSelected;
      const off = tab.face;

      // Typed up front: an inline array of eight differently-keyed objects
      // widens to a union whose members carry `undefined` siblings, which is
      // not a `Record<string, Control>`.
      const states: ControlEntry[] = [
        { checked: state(on, tab.label, paneRef) },
        { checked_hover: state(on, tab.label, paneRef) },
        { checked_locked: state(on, tab.label, paneRef) },
        { checked_locked_hover: state(on, tab.label, paneRef) },
        { unchecked: state(off, tab.label, undefined) },
        { unchecked_hover: state(off, tab.label, undefined) },
        { unchecked_locked: state(off, tab.label, undefined) },
        { unchecked_locked_hover: state(off, tab.label, undefined) },
      ];

      return {
        [tab.name]: {
          type: 'toggle',
          size: [width, tabHeight] as [number, number],
          offset: [index * width, 0] as [number, number],
          ...topLeft,
          layer: 1,
          sound_name: 'random.click',
          sound_volume: 1,
          sound_pitch: 1,
          focus_enabled: true,
          focus_magnet_enabled: true,
          default_focus_precedence: 0,
          // One group per `<Tabs>`, named after it, so two groups on one screen
          // never pick each other's tabs.
          toggle_name: `${ctx.ns}_${node.name}`,
          radio_toggle_group: true,
          toggle_default_state: false,
          toggle_group_forced_index: index,
          toggle_group_default_selected: 0,
          enable_directional_toggling: false,
          toggle_on_button: 'toggle.toggle_on',
          toggle_off_button: 'toggle.toggle_off',
          button_mappings: [
            { from_button_id: 'button.menu_select', to_button_id: 'button.menu_select', mapping_type: 'pressed' },
            { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_ok', mapping_type: 'focused' },
          ],
          controls: states,
          checked_control: 'checked',
          unchecked_control: 'unchecked',
          checked_hover_control: 'checked_hover',
          unchecked_hover_control: 'unchecked_hover',
          checked_locked_control: 'checked_locked',
          unchecked_locked_control: 'unchecked_locked',
          checked_locked_hover_control: 'checked_locked_hover',
          unchecked_locked_hover_control: 'unchecked_locked_hover',
        },
      };
    });

    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: headers,
      },
    };
  },
};
