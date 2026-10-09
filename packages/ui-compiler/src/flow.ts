import type { FlexStyle } from '@bedrock-core/flexbox';
import type { JSX } from '@bedrock-core/ui-runtime';
import { childElements, isTransparentType } from '@bedrock-core/ui-runtime/compile';
import type { Control, Document } from './jsonui';
import type { PanelNode } from './nodes/primitives/panel';
import { percent } from './nativeLayout';

export type Flow = 'horizontal' | 'vertical';

/** Authored sizing that a surviving native stack can express without changing its solved boxes. */
export interface FlowItem {
  width?: `${number}%`;
  height?: `${number}%`;
  grow?: number;
  fill?: true;
}

export const flowItemOf = (style: FlexStyle): FlowItem | undefined => {
  const constrained = [style.minWidth, style.maxWidth, style.minHeight, style.maxHeight, style.aspectRatio]
    .some(value => value !== undefined);
  const grow = style.flexGrow ?? style.flex ?? 0;
  const item: FlowItem = {
    ...!constrained && percent(style.width) ? { width: style.width } : {},
    ...!constrained && percent(style.height) ? { height: style.height } : {},
    ...Number.isFinite(grow) && grow > 0
      ? { grow,
          ...!constrained && (style.flexBasis === undefined || style.flexBasis === 0) ? { fill: true as const } : {} }
      : {},
  };

  return Object.keys(item).length === 0 ? undefined : item;
};

/** Only ordinary, unwrapped flex flow can use a native stack. */
export const flowOf = (element: JSX.Element): Flow | undefined => {
  const style = element.props.__layout;

  if (typeof style !== 'object' || style === null || element.props.stack === true) { return undefined; }

  const { flexDirection = 'column', wrap }: FlexStyle = style;

  if ((flexDirection !== 'row' && flexDirection !== 'column')
    || (wrap !== undefined && wrap !== 'nowrap')) { return undefined; }

  const inFlow = (child: JSX.Element): boolean => {
    if (typeof child.type !== 'string') { return false; }

    if (isTransparentType(child.type)) { return childElements(child.props.children).every(inFlow); }

    const raw = child.props.__layout;
    const layout: FlexStyle = typeof raw === 'object' && raw !== null ? raw : {};

    return layout.position !== 'absolute' && layout.top === undefined && layout.right === undefined
      && layout.bottom === undefined && layout.left === undefined;
  };

  return childElements(element.props.children).every(inFlow)
    ? flexDirection === 'row' ? 'horizontal' : 'vertical'
    : undefined;
};

export interface FlowPanel {
  flow: Flow;
  background: boolean;
  size?: [number, number];
  items?: ReadonlyMap<string, FlowItem>;
}

/** Layout hints only apply to panels whose own behavior cannot reflow their children. */
export const flowPanel = (node: PanelNode): FlowPanel | undefined => {
  if (node.flow === undefined || node.id !== undefined || node.native !== undefined
    || node.stack !== undefined || node.visible !== undefined || node.carriedVisible !== undefined
    || node.carriedLook !== undefined || node.lookGate !== undefined || node.follows !== undefined) { return undefined; }

  const items = new Map(node.children.flatMap(child => child.flowItem === undefined ? [] : [[child.name, child.flowItem] as const]));

  return { flow: node.flow, background: node.background !== undefined,
    ...items.size === 0 ? {} : { size: [node.rect.width, node.rect.height], items } };
};

const panelProperties = new Set(['type', 'size', 'offset', 'anchor_from', 'anchor_to', 'layer', 'controls']);
const pixels = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(part => typeof part === 'number' && Number.isFinite(part));

/** Replace surviving layout panels with equivalent stacks without adding spacers or wrappers. */
export const flowPanels = (document: Document, candidates: ReadonlyMap<string, FlowPanel>): Document => {
  const result = structuredClone(document);
  const referenced = new Set<string>();

  const references = (value: unknown): void => {
    if (typeof value === 'string') {
      for (const name of value.match(/[\w-]+/g) ?? []) { referenced.add(name); }
    } else if (value !== null && typeof value === 'object') { Object.values(value).forEach(references); }
  };

  references(document);

  const stack = (parent: Control, candidate: FlowPanel): void => {
    if (parent.type !== 'panel' || !Object.keys(parent).every(key => panelProperties.has(key))
      || parent.size === undefined || !parent.size.every(value => typeof value === 'number' || /^\d+(?:\.\d+)?%$/.test(value))) { return; }

    const entries = parent.controls ?? [];

    if (entries.length === 0 || entries.some(entry => Object.keys(entry).length !== 1)) { return; }

    const { flow } = candidate;
    const axis = flow === 'horizontal' ? 0 : 1;
    let end = 0;
    const controls: { control: Control; offset: [number, number]; size: [number, number]; item?: FlowItem }[] = [];

    for (const entry of entries) {
      const [name, child] = Object.entries(entry)[0];

      if (name.includes('@') || referenced.has(name) || child.type === undefined
        || !pixels(child.size) || child.size.some(value => value < 0) || !pixels(child.offset)
        || child.anchor_from !== 'top_left' || child.anchor_to !== 'top_left'
        || child.offset[axis] !== end || child.offset[1 - axis] !== 0
        || ['visible', 'ignored', 'bindings', 'variables', 'min_size', 'max_size', 'contained', 'collection_index', 'ignoreCollectionItem',
          'inherit_max_sibling_width', 'inherit_max_sibling_height', 'use_anchored_offset',
          'draggable', 'follows_cursor', 'property_bag'].some(key => key in child)) { return; }

      end += child.size[axis];
      controls.push({ control: child, offset: [child.offset[0], child.offset[1]],
        size: [child.size[0], child.size[1]], item: candidate.items?.get(name) });
    }

    const parentSize = candidate.size;
    const growing = controls.filter(child => child.item?.grow !== undefined);
    const remaining = parentSize === undefined
      ? 0
      : parentSize[axis]
        - controls.filter(child => child.item?.grow === undefined).reduce((sum, child) => sum + child.size[axis], 0);
    const fill = growing.length > 0 && parentSize !== undefined && end === parentSize[axis]
      && Number.isSafeInteger(remaining / growing.length) && remaining > 0
      && growing.every(child => child.item?.fill === true && child.item.grow === growing[0].item?.grow
        && child.size[axis] === remaining / growing.length);
    let relative = false;

    for (const child of controls) {
      const size: NonNullable<Control['size']> = [...child.size];

      for (const [dimension, value] of [child.item?.width, child.item?.height].entries()) {
        if (value !== undefined && parentSize !== undefined
          && Number.parseFloat(value) * parentSize[dimension] / 100 === child.size[dimension]) {
          size[dimension] = value;
          relative = true;
        }
      }

      if (fill && child.item?.grow !== undefined) { size[axis] = 'fill'; relative = true; }

      child.control.size = size;
    }

    if (entries.length === 1 && !relative) { return; }

    parent.type = 'stack_panel';
    parent.orientation = flow;

    for (const { control, offset } of controls) {
      offset[axis] = 0;
      control.offset = offset;
    }
  };

  const visit = (name: string, control: Control): void => {
    const candidate = candidates.get(name);

    if (candidate !== undefined) {
      const target = candidate.background
        ? control.controls?.find(entry => 'content' in entry)?.['content']
        : control;

      if (target !== undefined) { stack(target, candidate); }
    }

    for (const entry of control.controls ?? []) {
      for (const [name, child] of Object.entries(entry)) { visit(name, child); }
    }
  };

  for (const [name, control] of Object.entries(result)) {
    if (typeof control !== 'string' && !('modifications' in control)) { visit(name, control); }
  }

  return result;
};
