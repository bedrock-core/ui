import { DISCLOSURE_HEADER_SLOT_TYPE, DISCLOSURE_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { disclosureFace } from '../../faces';
import type { Control, ControlEntry } from '../../jsonui';
import { boxOf, FULL, num, sizeOf, str, topLeft } from '../utils/shared';
import { stackRows } from '../utils/stack';
import type { IrNode, NodeBase, NodeDefinition, Rect } from '../utils/types';

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

declare module '../utils/types' {
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

    // The rows sit under the header in the layout; in their own stack they
    // start at its top.
    const rows = node.rows.map(row => ({ ...row, rect: { ...row.rect, y: row.rect.y - node.headerHeight } }));

    return disclosureFace({
      ...boxOf(node),
      headerHeight: node.headerHeight,
      open: node.defaultOpen,
      group: `${ctx.ns}_${node.name}`,
      swapName: head,
      header: state(`${ctx.ns}.${closed}`),
      headerOpen: state(`${ctx.ns}.${open}`),
      rows: stackRows(rows, width, ctx),
    });
  },
};
