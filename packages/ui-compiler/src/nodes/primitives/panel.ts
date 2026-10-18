import type { JSX } from '@bedrock-core/ui-runtime';
import { PANEL_TYPE, SELECTION_PAGE_SLOT_TYPE, selectionMaskLength } from '@bedrock-core/ui-runtime/compile';
import { panelFace } from '../../faces';
import { type Flow, flowOf } from '../../flow';
import { nativeLayout, type NativeLayout } from '../../nativeLayout';
import { boxOf, collapses, layerOf, offsetOf, sizeOf, str, topLeft, visibilityOf } from '../utils/shared';
import { stackColumns, stackRows } from '../utils/stack';
import type { IrNode, NodeBase, NodeDefinition } from '../utils/types';

/** The flex props the layout parked on the element, as the stack reads them. */
const layoutOf = (props: JSX.Props): { row: boolean; centred: boolean } => {
  const layout = props.__layout;

  if (typeof layout !== 'object' || layout === null) {
    return { row: false, centred: false };
  }

  return {
    row: 'flexDirection' in layout && layout.flexDirection === 'row',
    centred: 'justifyContent' in layout && layout.justifyContent === 'center',
  };
};

/** A container. Draws its background, if it has one, behind its children. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  /** Native selection controlling a fixed overlay. */
  selection?: { readonly group: string; readonly indexes: readonly number[]; readonly mask?: { readonly address: number; readonly initial: string } };
  /** An input overlay shares its enclosing caption's native dimensions. */
  inputFill?: true;
  native?: NativeLayout;
  /** Authored flow eligible for a native stack after redundant panels are removed. */
  flow?: Flow;
  /** Nineslice texture drawn over the whole rect, under the children. */
  background?: string;
  /**
   * Emitted as a stack rather than a box, so a child that folds away gives up
   * its space and the children after it move up. Declared by the composition
   * that folds, and inherited by every panel holding one.
   */
  stack?: true;
  /** A stack along the row, from the panel's own `flexDirection`. */
  row?: true;
  /**
   * The stack hangs from the middle of the box the layout gave it rather than
   * from its left, from the panel's own `justifyContent`. What centres a row
   * whose width is only known once the strings in it arrive.
   */
  centred?: true;
  children: IrNode[];
}

declare module '../utils/types' {
  interface IrNodeMap {
    panel: PanelNode;
  }
}

export const panelDefinition: NodeDefinition<PanelNode> = {
  kind: 'panel',
  types: [PANEL_TYPE, SELECTION_PAGE_SLOT_TYPE],

  lower(element, type, ctx): PanelNode {
    const background = str(element.props.background);
    // Children are relative to THIS panel, not to the grandparent.
    const children = ctx.children(element, ctx.own);
    const folds = element.props.stack === true || children.some(collapses);
    const { row, centred } = layoutOf(element.props);
    const selected = type === SELECTION_PAGE_SLOT_TYPE;
    const group = element.props.selectionGroup;
    const index = element.props.selectionIndex;
    const indexes = element.props.selectionIndexes ?? [index];
    let selection: PanelNode['selection'];

    if (selected) {
      if (typeof group !== 'string' || !/^[A-Za-z0-9_-]+$/.test(group)
        || !Array.isArray(indexes) || indexes.length === 0
        || indexes.some(value => typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        || new Set(indexes).size !== indexes.length) {
        throw new Error('A selection panel requires a selection group and a nonnegative selection index.');
      }

      const active: unknown = element.props.selectionActiveIndexes;

      if (active !== undefined && (!Array.isArray(active) || active.some(value => !indexes.includes(value)))) {
        throw new Error('Active selection indexes must belong to the compiled selection universe.');
      }

      const dynamic = selectionMaskLength(element) !== undefined;

      selection = { group, indexes, ...dynamic
        ? { mask: {
            address: ctx.channelOf(element).address,
            initial: `m|${Array.isArray(active) ? active.join('|') : ''}|`,
          } }
        : {} };
    }

    if (selected && folds) { throw new Error('A selection panel is a fixed overlay; put folding content in a Panel inside it.'); }

    const flow = folds || selected ? undefined : flowOf(element);
    const style = element.props.__layout;
    const native = ctx.responsive === true && typeof style === 'object' && style !== null
      ? nativeLayout(style, ctx.rect)
      : undefined;

    if (native !== undefined && folds) {
      throw new Error('Responsive panel placement is not supported on a folding stack.');
    }

    if (folds && background !== '') {
      throw new Error(
        'A panel holding a fold is drawn as a stack so the fold can reflow the rows below it, '
        + 'and a stack has no room for a background. Put the background on a panel around it.',
      );
    }

    return {
      kind: 'panel',
      ...selection === undefined ? {} : { selection },
      name: ctx.name('panel'),
      rect: ctx.rect,
      ...native === undefined ? {} : { native },
      ...flow === undefined ? {} : { flow },
      ...ctx.decoration,
      ...background === '' ? {} : { background },
      ...folds ? { stack: true as const } : {},
      ...folds && row ? { row: true as const } : {},
      ...folds && row && centred ? { centred: true as const } : {},
      children,
    };
  },

  children: node => node.children,

  socket: node => node.selection?.mask === undefined ? undefined : 'selection',

  face(node, ctx) {
    if (node.selection !== undefined) {
      const { group, indexes } = node.selection;
      const properties = indexes.map(index => `#navigation_selected_${index}`);

      return {
        [node.name]: {
          type: 'panel', size: node.inputFill === true ? ['100%', '100%'] : sizeOf(node.rect),
          offset: node.inputFill === true ? [0, 0] : offsetOf(node.rect), ...topLeft, ...layerOf(node),
          visible: '#visible',
          property_bag: { '#visible': indexes.some(index => ctx.radioInputs(group, index).some(input => input.on)) && node.visible !== false,
            ...Object.fromEntries(indexes.map((index, at) => [properties[at], ctx.radioInputs(group, index).some(input => input.on)])),
          },
          bindings: [
            ...indexes.map((index, at) => ({ binding_type: 'view' as const,
              source_control_name: ctx.selectionSource(group, index), source_property_name: '#navigation_selected',
              target_property_name: properties[at],
            })),
            { binding_type: 'view', source_property_name: `(${properties.join(' or ')})`, target_property_name: '#visible' },
          ],
          controls: node.children.map(child => ctx.emitNode(child)),
        },
      };
    }

    if (node.stack === true && node.row === true) {
      // The stack is as wide as what it holds, so it cannot also be the box the
      // layout placed: the box stays, and the stack hangs inside it.
      return {
        [node.name]: {
          type: 'panel',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          ...layerOf(node),
          ...visibilityOf(node),
          controls: [{
            [`${node.name}_row`]: {
              type: 'stack_panel',
              orientation: 'horizontal',
              size: ['100%c', node.rect.height],
              ...node.centred === true
                ? { anchor_from: 'center', anchor_to: 'center' }
                : topLeft,
              controls: stackColumns(node.children, node.rect.height, node.centred === true, ctx),
            },
          }],
        },
      };
    }

    if (node.stack === true) {
      return {
        [node.name]: {
          type: 'stack_panel',
          orientation: 'vertical',
          size: [node.rect.width, '100%c'],
          ...layerOf(node),
          ...visibilityOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          controls: stackRows(node.children, node.rect.width, ctx),
        },
      };
    }

    return panelFace({
      ...boxOf(node),
      ...node.background === undefined ? {} : { background: node.background },
      children: node.children.map(child => ctx.emitNode(child)),
    });
  },
};
