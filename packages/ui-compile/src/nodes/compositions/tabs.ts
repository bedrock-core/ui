import { TAB_SLOT_TYPE, TABS_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { stateFace, type Tab, tabsFace } from '../../faces';
import type { Control } from '../../jsonui';
import { boxOf, FONT_SIZE, FULL, num, sizeOf, str, topLeft } from '../utils/shared';
import type { IrNode, NodeBase, NodeDefinition, Rect } from '../utils/types';

/**
 * Tabs: several panes on one screen, switched entirely on the client.
 *
 * A radio toggle group swaps its content with NOTHING reaching script, so a
 * tab change costs no press, no re-present and no payload. The group is drawn
 * by the faces layer, which also carries the two rules a swap has to obey; see
 * `faces/utils/swap.ts`.
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

declare module '../utils/types' {
  interface IrNodeMap {
    tabs: TabsNode;
    tab: TabNode;
  }
}

/** A pane's children are solved from the pane's own top-left. */
const PANE_ORIGIN: Rect = { x: 0, y: 0, width: 0, height: 0 };

const UNSTYLED = 'textures/ui/unstyled';

/**
 * One tab's header: the face, with the caption over it.
 *
 * The caption names no font: a tab takes whatever it is drawn inside, which is
 * the render pack's own. B3 makes it a JSX face the author passes instead.
 */
const header = (texture: string, caption: string): Control => stateFace(texture, [{
  caption: {
    type: 'label',
    size: FULL,
    ...topLeft,
    text: caption,
    localize: false,
    font_size: FONT_SIZE,
  },
}]);

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

  face(node, ctx) {
    const { tabs, tabHeight } = node;
    const width = tabs.length === 0 ? node.rect.width : Math.floor(node.rect.width / tabs.length);

    const drawn: Tab[] = tabs.map((tab, index): Tab => {
      // The pane is a definition of its own so both checked states can name it
      // without emitting it twice.
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

      return {
        name: tab.name,
        header: header(tab.face, tab.label),
        headerSelected: header(tab.faceSelected, tab.label),
        pane: `${ctx.ns}.${pane}`,
      };
    });

    return tabsFace({
      ...boxOf(node),
      headerHeight: tabHeight,
      // One group per `<Tabs>`, named after it AND after the screen, so two
      // groups never pick each other's tabs.
      group: `${ctx.ns}_${node.name}`,
      tabs: drawn,
    });
  },
};
