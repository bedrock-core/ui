import { DISCLOSURE_HEADER_SLOT_TYPE, DISCLOSURE_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import type { Control, ControlEntry } from '../jsonui';
import { FULL, layerOf, num, offsetOf, sizeOf, str, topLeft, visibilityOf } from './shared';
import { stackRows } from './stack';
import type { IrNode, NodeBase, NodeDefinition, Rect } from './types';

/**
 * Disclosure: a header that folds the rows under it, on the client.
 *
 * The header is a toggle; the rows are a stack beside it whose `visible` is a
 * view binding on the toggle's `#toggle_state` — vanilla's own idiom for a
 * section that opens and closes, and one `source_control_name` resolves among
 * siblings, which is what the two are. Both live in a stack of their own, and a
 * stack gives a hidden child no space (measured), so the fold reflows every
 * row below it with nothing reaching script. A column that holds a disclosure
 * is emitted as a stack for the same reason (see the panel kind).
 *
 * The toggle draws the state it is in and nothing else, so each header is a
 * definition both matching states name — the rule the Tabs lowering learned.
 */
export interface DisclosureHeaderNode extends NodeBase {
  kind: 'disclosureHeader';
  state: 'open' | 'closed';
  children: IrNode[];
}

export interface DisclosureNode extends NodeBase {
  kind: 'disclosure';
  headerHeight: number;
  defaultOpen: boolean;
  headerOpen: IrNode[];
  headerClosed: IrNode[];
  rows: IrNode[];
}

declare module './types' {
  interface IrNodeMap {
    disclosure: DisclosureNode;
    disclosureHeader: DisclosureHeaderNode;
  }
}

/** One toggle state: the header definition this state draws. */
const state = (header: string): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [{ [`header@${header}`]: {} }],
});

export const disclosureHeaderDefinition: NodeDefinition<DisclosureHeaderNode> = {
  kind: 'disclosureHeader',
  types: [DISCLOSURE_HEADER_SLOT_TYPE],

  children: node => node.children,

  lower(element, _type, ctx): DisclosureHeaderNode {
    return {
      kind: 'disclosureHeader',
      name: ctx.name('disclosure_header'),
      rect: ctx.rect,
      ...ctx.decoration,
      state: str(element.props.state) === 'closed' ? 'closed' : 'open',
      children: ctx.children(element, ctx.own),
    };
  },

  // A header never emits on its own: its group bakes it into the toggle's
  // states. Reaching here means the slot was written outside a `<Disclosure>`.
  face(node) {
    return { [node.name]: { type: 'panel', size: sizeOf(node.rect), ...topLeft } };
  },
};

export const disclosureDefinition: NodeDefinition<DisclosureNode> = {
  kind: 'disclosure',
  types: [DISCLOSURE_SLOT_TYPE],

  children: node => [...node.headerOpen, ...node.headerClosed, ...node.rows],

  lower(element, _type, ctx): DisclosureNode {
    const lowered = ctx.children(element, ctx.own);
    const headers = lowered.filter((child): child is DisclosureHeaderNode => child.kind === 'disclosureHeader');

    return {
      kind: 'disclosure',
      name: ctx.name('disclosure'),
      rect: ctx.rect,
      ...ctx.decoration,
      headerHeight: num(element.props.headerHeight, 20),
      defaultOpen: element.props.defaultOpen !== false,
      headerOpen: headers.find(header => header.state === 'open')?.children ?? [],
      headerClosed: headers.find(header => header.state === 'closed')?.children ?? [],
      rows: lowered.filter(child => child.kind !== 'disclosureHeader'),
    };
  },

  face(node, ctx): ControlEntry {
    const width = node.rect.width;
    // Named after the SCREEN too: a source_control_name is looked up by name,
    // and every gated compiled screen is constructed on every form open, so a
    // second screen's `disclosure_1_head` — another addon's guide index — would
    // otherwise be the one the rows read (measured: the rows followed a toggle
    // on a hidden screen and never folded).
    const head = `${ctx.ns}_${node.name}_head`;
    const open = `${node.name}_open`;
    const closed = `${node.name}_closed`;
    const headerRect: Rect = { x: 0, y: 0, width, height: node.headerHeight };

    for (const [name, children] of [[open, node.headerOpen], [closed, node.headerClosed]] as const) {
      ctx.defs[name] = {
        type: 'panel',
        size: sizeOf(headerRect),
        ...topLeft,
        controls: children.map(child => ctx.emitNode(child)),
      };
    }

    const on = state(`${ctx.ns}.${open}`);
    const off = state(`${ctx.ns}.${closed}`);
    const states: ControlEntry[] = [
      { checked: on },
      { checked_hover: on },
      { checked_locked: on },
      { checked_locked_hover: on },
      { unchecked: off },
      { unchecked_hover: off },
      { unchecked_locked: off },
      { unchecked_locked_hover: off },
    ];

    // The rows sit under the header in the layout; in their own stack they
    // start at its top.
    const rows = node.rows.map(row => ({ ...row, rect: { ...row.rect, y: row.rect.y - node.headerHeight } }));

    return {
      [node.name]: {
        type: 'stack_panel',
        orientation: 'vertical',
        size: [width, '100%c'],
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: [
          {
            [head]: {
              type: 'toggle',
              size: [width, node.headerHeight],
              ...topLeft,
              layer: 1,
              sound_name: 'random.click',
              sound_volume: 1,
              sound_pitch: 1,
              focus_enabled: true,
              focus_magnet_enabled: true,
              default_focus_precedence: 0,
              toggle_name: `${ctx.ns}_${node.name}`,
              toggle_default_state: node.defaultOpen,
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
          },
          {
            [`${node.name}_rows`]: {
              type: 'stack_panel',
              orientation: 'vertical',
              size: [width, '100%c'],
              ...topLeft,
              visible: '#visible',
              property_bag: { '#visible': node.defaultOpen },
              bindings: [
                {
                  binding_type: 'view',
                  source_control_name: head,
                  // Among siblings, not the whole screen — the name is unique
                  // anyway, but the lookup is what the engine documents.
                  resolve_sibling_scope: true,
                  source_property_name: '#toggle_state',
                  target_property_name: '#visible',
                },
              ],
              controls: stackRows(rows, width, ctx),
            },
          },
        ],
      },
    };
  },
};
