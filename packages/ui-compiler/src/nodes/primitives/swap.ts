import { SWAP_LOOK_SLOT_TYPE, SWAP_SLOT_TYPE, type SwapState } from '@bedrock-core/ui-runtime/compile';
import { CONTENT_LAYER, FULL, type SwapLooks, swap, topLeft } from '../../faces';
import type { Control, ControlEntry } from '../../jsonui';
import { layerOf, num, sizeOf, str, visibilityOf } from '../utils/shared';
import type { FaceEmit, IrNode, NodeBase, NodeDefinition } from '../utils/types';

/**
 * A look the client swaps by itself.
 *
 * A toggle changes its own content with nothing reaching script, so everything
 * built on it — a tab change, a fold, a choice between options — costs no
 * press, no re-present and no payload. This is the primitive; the arrangement
 * is the component layer's, which is why the same node draws a row of tabs and
 * a section that folds.
 *
 * Each look is a definition of its own, named by both the states that draw it,
 * so a look shared between two states is emitted once. Its content is drawn
 * INSIDE the state, which is what keeps a swap client-only: nothing outside
 * the toggle has to observe which state is current, so nothing has to be told
 * when it changes. A control that cannot live inside a look reads the swap
 * back by name instead — see {@link NodeBase.follows}.
 */
export interface LookNode extends NodeBase {
  kind: 'look';
  state: SwapState;
  /** Contextual inputs are layered outside the visual state faces. */
  inputs?: true;
  /**
   * The `id` of a sibling of this look's SWAP, drawn inside this state.
   *
   * For content that is bigger than the control that switches to it: a tab's
   * pane is the whole box under the headers, and the layout has to solve it
   * there rather than inside one header cell. Drawn inside the state all the
   * same, so a pane whose tab is not chosen is never built — which is what
   * keeps an engine field in a tab off a collection row that is not there.
   */
  draws?: string;
  children: IrNode[];
}

export interface SwapNode extends NodeBase {
  /** Inline navigation caption and input follow the client's glyph dimensions. */
  hug?: true;
  /** Content outside the state faces so every state shares its measured size. */
  caption?: IrNode[];
  /** Contextual inputs sharing the caption's native box. */
  inputs?: IrNode[];
  inputFill?: true;
  /** Persistent selection owner with no input or focus surface. */
  passive?: true;
  enabled?: false;
  /** The author's id for this swap, which a `follows` names it by. */
  id: string;
  kind: 'swap';
  /**
   * Swaps sharing this move together. Absent on an exclusive swap means the
   * group its siblings form, which is how a row of tabs is one group without
   * anything naming it.
   */
  group?: string;
  /** Which member of the group this is, when only one may be on. */
  index?: number;
  /** Whether turning this one on turns the rest of its group off. */
  exclusive: boolean;
  /** Which state the screen opens in. */
  on: boolean;
  looks: LookNode[];
}

declare module '../utils/types' {
  interface IrNodeMap {
    swap: SwapNode;
    look: LookNode;
  }
}

/**
 * The control name a swap is emitted under, and the name a `follows` resolves.
 *
 * Carries the screen's namespace because a `source_control_name` is looked up
 * screen-wide. Qualified names keep mounted screens and groups independent.
 */
export const swapControlName = (ns: string, id: string): string => `${ns}_${id}`;

/**
 * The eight states, in the order the engine's `*_control` properties expect.
 *
 * A state the author misspelled falls to the resting off look rather than
 * defining a ninth: the engine draws the one its current state names and
 * nothing else, so a name it does not know is a control that vanishes.
 */
const STATES: readonly SwapState[] = [
  'on', 'onHover', 'onLocked', 'onLockedHover',
  'off', 'offHover', 'offLocked', 'offLockedHover',
];

const stateOf = (value: unknown): SwapState => STATES.find(state => state === value) ?? 'off';

/** Input overlays fill the caption and never contribute another measured caption. */
const fillInput = (node: IrNode): void => {
  if (node.kind === 'panel') {
    if (node.selection === undefined) { throw new Error('A swap input overlay requires a selection panel.'); }

    node.inputFill = true;
    node.children.forEach(fillInput);
  } else if (node.kind === 'button' || node.kind === 'swap') {
    if (node.kind === 'button' && (node.children.length > 0 || node.action !== undefined)) {
      throw new Error('A swap input button has no caption or engine action.');
    }

    node.inputFill = true;
  } else {
    throw new Error('A swap input overlay contains selection panels, buttons, or swaps only.');
  }
};

/** One state's look, as the toggle mounts it: a box filling the swap, holding the definition. */
const mount = (definition: string): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [{ [`look@${definition}`]: {} }],
});

export const lookDefinition: NodeDefinition<LookNode> = {
  kind: 'look',
  types: [SWAP_LOOK_SLOT_TYPE],

  children: node => node.children,

  lower(element, _type, ctx): LookNode {
    return {
      kind: 'look',
      name: ctx.name('look'),
      rect: ctx.rect,
      ...ctx.decoration,
      state: stateOf(element.props.state),
      ...element.props.__swapInputs === true ? { inputs: true as const } : {},
      ...typeof element.props.draws === 'string' ? { draws: element.props.draws } : {},
      children: ctx.children(element, ctx.own),
    };
  },

  // A look never emits on its own: its swap bakes it into the toggle's states.
  // Reaching here means a `<Swap.Look>` was written outside a `<Swap>`.
  face(node) {
    return { [node.name]: { type: 'panel', size: sizeOf(node.rect), ...topLeft } };
  },
};

/** Every look, as a definition of its own, under the state that draws it. */
const looksOf = (node: SwapNode, ctx: FaceEmit): SwapLooks => {
  const drawn: Partial<Record<SwapState, Control>> = {};

  for (const look of node.looks) {
    const definition = `${node.name}_${look.state}`;

    ctx.defs[definition] = {
      type: 'panel',
      size: FULL,
      ...topLeft,
      // Inline state surfaces follow the caption's client-resolved dimensions.
      controls: look.children.map(child => Object.fromEntries(
        Object.entries(ctx.emitNode(child)).map(([name, control]) => [name,
          node.hug === true || node.inputFill === true ? { ...control, size: FULL, offset: [0, 0] } : control]),
      )),
    };

    drawn[look.state] = mount(`${ctx.ns}.${definition}`);
  }

  const { on, off } = drawn;

  if (on === undefined || off === undefined) {
    throw new Error(
      `The swap "${node.id}" has no look for its ${on === undefined ? 'on' : 'off'} state. `
      + 'A toggle draws the one its current state names and nothing else, so both are required.',
    );
  }

  return { ...drawn, on, off };
};

export const swapDefinition: NodeDefinition<SwapNode> = {
  kind: 'swap',
  types: [SWAP_SLOT_TYPE],

  children: node => [...node.looks, ...node.caption ?? [], ...node.inputs ?? []],

  lower(element, _type, ctx): SwapNode {
    // An id the author did not give is the minted name, which is unique within
    // the screen for the same reason every other name is. A composition that
    // has to name its swap from outside gives one; one whose follower is the
    // next sibling never needs to.
    const id = str(element.props.id, ctx.name('swap'));
    const lowered = ctx.children(element, ctx.own);
    const inputs = lowered.filter((child): child is LookNode => child.kind === 'look' && child.inputs === true)
      .flatMap(child => child.children);

    inputs.forEach(fillInput);

    return {
      kind: 'swap',
      name: id,
      rect: ctx.rect,
      ...ctx.decoration,
      id,
      ...typeof element.props.group === 'string' ? { group: element.props.group } : {},
      ...typeof element.props.index === 'number' ? { index: num(element.props.index) } : {},
      exclusive: element.props.exclusive === true,
      ...element.props.passive === true ? { passive: true as const } : {},
      ...element.props.__hug === true ? { hug: true as const } : {},
      ...lowered.some(child => child.kind !== 'look') ? { caption: lowered.filter(child => child.kind !== 'look') } : {},
      on: element.props.defaultOn === true,
      ...inputs.length === 0 ? {} : { inputs },
      ...element.props.enabled === false ? { enabled: false as const } : {},
      looks: lowered.filter((child): child is LookNode => child.kind === 'look' && child.inputs !== true),
    };
  },

  face(node, ctx): ControlEntry {
    const control = swap(
      {
        group: `${ctx.ns}_${node.group ?? node.id}`,
        ...node.index === undefined ? {} : { index: node.index },
        exclusive: node.exclusive,
        on: node.on,
      },
      looksOf(node, ctx),
      {
        size: node.inputFill === true ? FULL : sizeOf(node.rect),
        offset: node.inputFill === true ? [0, 0] : [node.rect.x, node.rect.y], ...topLeft,
        ...layerOf(node), ...visibilityOf(node), ...node.enabled === false ? { enabled: false } : {},
      },
    );

    if (node.passive !== true && node.exclusive && ctx.radioInputs(node.group ?? node.id, 0).some(input => input.passive)) {
      delete control.toggle_group_default_selected;
      control.toggle_default_state = false;
    }

    if (node.hug === true || node.caption !== undefined || node.inputs !== undefined) {
      const input: ControlEntry = node.inputs === undefined
        ? { [swapControlName(ctx.ns, node.id)]: {
            ...control, size: node.hug === true ? ['100%sm', '100%sm'] : FULL, offset: [0, 0], layer: 1,
          } }
        : { [`${node.name}_inputs`]: {
            type: 'panel', size: node.hug === true ? ['100%sm', '100%sm'] : FULL, offset: [0, 0], ...topLeft, layer: 1,
            controls: node.inputs.map(child => ctx.emitNode(child)),
          } };

      return {
        [node.name]: {
          type: 'panel', size: node.hug === true ? ['100%cm', '100%cm'] : sizeOf(node.rect), offset: [node.rect.x, node.rect.y],
          ...topLeft, ...layerOf(node), ...visibilityOf(node),
          controls: [
            ...(node.caption ?? []).map(child => Object.fromEntries(
              Object.entries(ctx.emitNode(child)).map(([name, caption]) => [name, { ...caption, layer: CONTENT_LAYER }]),
            )),
            input,
          ],
        },
      };
    }

    const input = {
      ...control,
      ...node.passive === true ? { focus_enabled: false, focus_magnet_enabled: false, button_mappings: [] } : {},
    };

    if (node.carriedVisible !== undefined) {
      const { visible: _visible, ...shown } = input;

      return { [node.name]: { type: 'panel', size: control.size, offset: control.offset, ...topLeft,
        ...layerOf(node), ...visibilityOf(node), controls: [{ [swapControlName(ctx.ns, node.id)]: {
          ...shown, size: FULL, offset: [0, 0],
        } }],
      } };
    }

    return {
      [swapControlName(ctx.ns, node.id)]: {
        ...input,
      },
    };
  },
};
