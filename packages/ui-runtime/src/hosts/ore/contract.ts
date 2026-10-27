import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isTextElementType } from '../../components/Text';
import { IMAGE_TYPE } from '../../components/Image';
import { SCROLL_SLOT_TYPE } from '../../components/Scroll';
import { isTransparentType } from '../../core/componentRegistry';
import { childElements } from '../../core/guards';
import { EXPERIMENTAL_ORE_TYPE } from '../../core/roots';
import type { JSX } from '../../jsx';
import { oreFieldValue, oreField, type OreField, type OreInput } from './fields';
import { oreDecorations, type OreDecoration } from './controls';

export const ORE_STATE_PREFIX = 'CORE_ORE_STATE:';
export const ORE_ACTION_PREFIX = 'CORE_ORE_ACTION:';
export const ORE_TEXT_PREFIX = 'CORE_ORE_TEXT:';
export const ORE_INPUT_PREFIX = 'CORE_ORE_INPUT:';
export const ORE_LIMIT = 5000;
export const ORE_NODE_LIMIT = 16384;
export const ORE_BUTTON_LIMIT = 512;
export const ORE_FRAME_PARTS = 64;
export const ORE_PART_PREFIX = 'CORE_ORE_PART:';

export interface OreBackgrounds {
  readonly normal: string;
  readonly hover?: string;
  readonly pressed?: string;
  readonly disabled?: string;
}

/** Pack-linker metadata. Insets use Bedrock order: left, top, right, bottom. */
export interface OreTexture {
  readonly size: readonly [number, number];
  readonly slice?: readonly [number, number, number, number];
  readonly base?: readonly [number, number];
}

export interface OreNode extends OreDecoration {
  readonly id: string;
  readonly kind: 'panel' | 'text' | 'button' | 'image' | 'scroll' | 'field' | 'switch';
  readonly initial?: OreValue;
  readonly parent?: string;
  readonly field?: OreField;
  readonly translationKey?: string;
  readonly localize?: boolean;
  readonly flow?: { readonly parent?: string; readonly hug?: boolean; readonly row?: boolean; readonly column?: boolean; readonly gap?: number; readonly autoHeight?: boolean; readonly padding?: readonly number[] };
  readonly rect: readonly [number, number, number, number];
  readonly source?: string;
  readonly live?: true;
  readonly resources?: readonly string[];
  readonly backgrounds?: OreBackgrounds;
  readonly button?: string;
  /** Zero is the screen; positive regions use viewport-local coordinates. */
  readonly region?: number;
  readonly scroll?: { readonly id: number; readonly viewport: readonly [number, number, number, number]; readonly extent: number };
  readonly textStyle?: { readonly scale: number; readonly align: 'left' | 'center' | 'right'; readonly font: 'default' | 'MinecraftTen'; readonly shadow: boolean; readonly offset: readonly [number, number]; readonly color?: readonly [number, number, number] };
}
export interface OreLayout {
  readonly schema: 'core-ore-layout/1';
  readonly screen: string;
  readonly asset: string;
  readonly title: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly view?: { readonly bounds: readonly [number, number, number, number]; readonly uiScale?: number };
  readonly textures?: Readonly<Record<string, OreTexture>>;
  readonly background?: string;
  readonly nodes: readonly OreNode[];
}
export interface OreValue {
  readonly id: string;
  readonly text: string;
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly input?: OreInput;
  readonly rect?: OreNode['rect'];
  readonly scroll?: OreNode['scroll'];
  readonly textStyle?: OreNode['textStyle'];
  readonly formatting?: readonly (readonly [number, string])[];
  readonly selection?: readonly number[];
  readonly source?: string;
  readonly backgrounds?: OreBackgrounds;
}
export interface OreState {
  readonly schema: 'core-ore-state/1';
  readonly screen: string;
  readonly session: number;
  readonly transport?: number;
  readonly revision: number;
  readonly ack: number;
  readonly asset: string;
  readonly values: readonly OreValue[];
  readonly title?: string;
  readonly error?: string;
}

/** Stable structural addresses shared by compilation, updates and native callbacks. */
export function oreElements(tree: JSX.Element): { id: string; element: JSX.Element; button?: string; region: number; scroll?: number; visible: boolean }[] {
  const result: { id: string; element: JSX.Element; button?: string; region: number; scroll?: number; visible: boolean }[] = [];
  let scrolls = 0;

  function visit(element: JSX.Element, path: string, button?: string, region = 0, parentVisible = true): void {
    const isScroll = element.type === SCROLL_SLOT_TYPE;
    const transparent = !isScroll && typeof element.type === 'string' && isTransparentType(element.type);
    const scroll = isScroll ? ++scrolls : undefined;
    const visible = parentVisible && element.props.visible !== false;

    if (transparent && ![EXPERIMENTAL_ORE_TYPE, 'fragment', 'context-provider', 'expect-host', 'background'].includes(String(element.type))) {
      throw new Error(`Unsupported Ore structure: ${String(element.type)}.`);
    }

    if (!transparent) {
      const isButton = element.type === 'button';

      if (!['panel', 'list-slot', 'swap-slot', 'swap-look-slot', 'selection-page-slot'].includes(String(element.type)) && !isButton && element.type !== IMAGE_TYPE && !isTextElementType(element.type) && !isScroll && !oreField(element)) {
        throw new Error(`Unsupported Ore element: ${String(element.type)}. Only Panel, Text, Button, Scroll and static Image are supported.`);
      }

      if (button !== undefined && (isButton || oreField(element))) { throw new Error('Ore buttons cannot contain another control.'); }

      result.push({ id: path, element, region, visible, ...scroll === undefined ? {} : { scroll }, ...button === undefined ? {} : { button } });
    }

    if (oreField(element)) { return; }

    childElements(element.props.children).forEach((child, index) => visit(child, `${path}_${index}`, element.type === 'button' ? path : button, scroll ?? region,
      visible && (element.type !== 'list-slot' || index < Number(element.props.count))));
  }

  visit(tree, 'n');

  if (result.length > ORE_NODE_LIMIT) { throw new Error(`Experimental Ore screens support at most ${ORE_NODE_LIMIT} nodes.`); }

  if (result.filter(({ element }) => element.type === 'button').length > ORE_BUTTON_LIMIT) { throw new Error(`Experimental Ore screens support at most ${ORE_BUTTON_LIMIT} buttons.`); }

  if (result.filter(({ element }) => oreField(element)).length > 16) { throw new Error('Experimental Ore screens support at most 16 live fields.'); }

  return result;
}

export function oreText(element: JSX.Element, formatted = false): string {
  if (isTextElementType(element.type)) {
    const value = element.props.value;
    const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : value;

    const metrics = element.props.__textMetrics;

    if (typeof metrics === 'object' && metrics !== null && 'isKey' in metrics && metrics.isKey === true) {
      const text = 'resolvedText' in metrics && typeof metrics.resolvedText === 'string' ? metrics.resolvedText : '';

      return formatted ? text : text.replace(/\u00a7./g, '');
    }

    if (typeof tail !== 'string') { throw new Error('Ore text requires a string or RawMessage.'); }

    return formatted ? tail : tail.replace(/\u00a7./g, '');
  }

  return element.type === 'button'
    ? childElements(element.props.children).map(child => oreText(child)).filter(Boolean).join(' ') || String(element.props.label ?? '')
    : '';
}

function textureSource(texture: unknown): string {
  if (typeof texture !== 'string' || !/^textures\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+(?:\.png)?$/.test(texture)) {
    throw new Error('Experimental Ore textures require a pack-local PNG texture path.');
  }

  return `pack://${texture.endsWith('.png') ? texture : `${texture}.png`}`;
}

function backgrounds(element: JSX.Element): OreBackgrounds | undefined {
  if (element.type === SCROLL_SLOT_TYPE) { return undefined; }

  const value = element.props.background;

  if (value === '' || value === undefined) { return undefined; }

  return { normal: textureSource(value), ...element.type !== 'button' && !oreField(element)
    ? {}
    : {
        hover: textureSource(element.props.backgroundHover ?? value),
        pressed: textureSource(element.props.backgroundPressed ?? value),
        disabled: textureSource(element.props.backgroundLocked ?? value),
      } };
}

function imageSource(element: JSX.Element): string {
  const value = element.props.value;
  const texture = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;

  return textureSource(texture);
}

export function oreLayout(tree: JSX.Element, screen: string): OreLayout {
  if (!/^[A-Za-z0-9_-]+$/.test(screen)) { throw new Error('Invalid Ore screen identity.'); }

  const entries = oreElements(tree);
  const byPath = new Map(entries.map(entry => [entry.id, entry.element]));

  // Read every value during compilation too, so unsupported text fails before deployment.
  entries.forEach(({ element }) => oreText(element));
  const titleRoot = findRoot(tree);
  const decorations = oreDecorations(tree);
  const backdrop = backgroundsIn(tree)[0];

  const nodes: OreNode[] = entries.map(({ id, element, button, region, scroll }) => ({ id, kind: kind(element),
    ...parentEntry(id, byPath) ? { parent: parentEntry(id, byPath) } : {},
    ...decorations.get(id),
    ...oreField(element) === undefined ? {} : { field: { ...oreField(element)!, surfaces: Object.fromEntries(Object.entries(oreField(element)!.surfaces ?? {}).map(([key, source]) => [key, textureSource(source)])) } },
    ...textTranslations(element) === undefined ? {} : { translationKey: `core.ore.${screen}.${id}` },
    ...!localized(element) ? {} : { localize: true },
    ...flow(id, element, byPath) === undefined ? {} : { flow: flow(id, element, byPath) },
    ...region === 0 ? {} : { region },
    ...scroll === undefined ? {} : { scroll: scrollGeometry(tree, scroll) },
    ...element.type === IMAGE_TYPE ? { source: imageSource(element) } : {},
    ...element.type === IMAGE_TYPE && element.props.__live === true ? { live: true as const } : {},
    ...Array.isArray(element.props.__resourceTextures) ? { resources: element.props.__resourceTextures.filter((source): source is string => typeof source === 'string').map(textureSource) } : {},
    ...backgrounds(element) === undefined ? {} : { backgrounds: backgrounds(element) },
    ...button === undefined ? {} : { button },
    ...isTextElementType(element.type) ? { textStyle: textStyle(element) } : {},
    rect: [number(element.props.jsonUIx), number(element.props.jsonUIy), number(element.props.jsonUIWidth), number(element.props.jsonUIHeight)] }));

  const layout: OreLayout = {
    schema: 'core-ore-layout/1', screen, asset: `/hbui/core-ore/${screen}.json`,
    title: typeof titleRoot?.props.title === 'string' ? titleRoot.props.title : 'Experimental Ore UI',
    canvas: CANONICAL_SCREEN,
    nodes, view: view(tree, nodes),
    ...backdrop ? { background: textureSource(backdrop.props.__background) } : {},
  };

  // Keep room for real transport identities and acknowledgements before showing a native form.
  const initial = oreValues(tree, layout);

  nodes.forEach((node, index) => { Object.assign(node, { initial: initial[index] }); });
  oreStateFrame({ schema: 'core-ore-state/1', screen, asset: layout.asset, title: layout.title,
    session: Number.MAX_SAFE_INTEGER, transport: Number.MAX_SAFE_INTEGER, revision: Number.MAX_SAFE_INTEGER, ack: Number.MAX_SAFE_INTEGER,
    values: initial }, layout);

  return layout;
}

function kind(element: JSX.Element): OreNode['kind'] {
  return isTextElementType(element.type) ? 'text' : oreField(element) ? 'field' : element.type === 'swap-slot' ? 'switch' : element.type === SCROLL_SLOT_TYPE ? 'scroll' : element.type === 'button' ? 'button' : element.type === IMAGE_TYPE ? 'image' : 'panel';
}

function backgroundsIn(tree: JSX.Element): JSX.Element[] {
  return tree.type === 'background' ? [tree] : childElements(tree.props.children).flatMap(backgroundsIn);
}

function parentEntry(id: string, entries: Map<string, JSX.Element>): string | undefined {
  for (let at = id.slice(0, id.lastIndexOf('_')); at; at = at.slice(0, at.lastIndexOf('_'))) {
    if (entries.has(at)) { return at; }
  }

  return undefined;
}

export function textTranslations(element: JSX.Element): Readonly<Record<string, string>> | undefined {
  const metrics = element.props.__textMetrics;

  return typeof metrics === 'object' && metrics !== null && 'translations' in metrics && typeof metrics.translations === 'object' && metrics.translations !== null
    ? Object.fromEntries(Object.entries(metrics.translations).map(([locale, value]) => [locale, String(value)]))
    : undefined;
}

function localized(element: JSX.Element): boolean {
  const metrics = element.props.__textMetrics;

  return typeof metrics === 'object' && metrics !== null && 'isKey' in metrics && metrics.isKey === true;
}

function flow(id: string, element: JSX.Element, entries: Map<string, JSX.Element>): OreNode['flow'] {
  const parentId = id.slice(0, id.lastIndexOf('_')), parent = entries.get(parentId);
  const metrics = element.props.__textMetrics;
  const hug = (typeof metrics === 'object' && metrics !== null && 'hug' in metrics && metrics.hug === true) || element.props.__hug === true;

  const rowLayout = (node: JSX.Element | undefined): boolean => {
    const layout = node?.props.__layout;

    return typeof layout === 'object' && layout !== null && 'flexDirection' in layout && layout.flexDirection === 'row';
  };

  const stack = (node: JSX.Element | undefined): boolean => !!node && (node.props.stack === true || node.type === 'list-slot'
    || (node.type === 'panel' && !rowLayout(node) && childElements(node.props.children).some(child => child.props.stack === true || child.type === 'list-slot')));
  const row = (element.type === 'panel' && stack(element) && rowLayout(element)) || element.props.__hug === true;
  const column = stack(element) && !row;
  const ownLayout = element.props.__layout;
  const absolute = typeof ownLayout === 'object' && ownLayout !== null && 'position' in ownLayout && ownLayout.position === 'absolute';
  const flowing = !absolute && (stack(parent) || parent?.props.__hug === true);
  const layout = parent?.props.__layout;
  const gap = typeof layout === 'object' && layout !== null && 'gap' in layout && typeof layout.gap === 'number' ? layout.gap : 0;
  const own = typeof ownLayout === 'object' && ownLayout !== null ? ownLayout : {};
  const padding = ['Top', 'Right', 'Bottom', 'Left'].map((side) => {
    const value: unknown = Reflect.get(own, 'padding' + side) ?? Reflect.get(own, 'padding') ?? 0;

    return typeof value === 'number' ? value : 0;
  });
  const autoHeight = column && Reflect.get(own, 'height') === undefined && !Reflect.get(own, 'flexGrow');

  return row || column || flowing
    ? { ...row ? { row: true } : {}, ...column ? { column: true } : {}, ...autoHeight ? { autoHeight: true } : {},
        ...padding.some(Boolean) && (row || column) ? { padding } : {}, ...!flowing ? {} : { parent: parentId, hug, gap } }
    : undefined;
}

function scrollGeometry(tree: JSX.Element, id: number): NonNullable<OreNode['scroll']> {
  const metrics = tree.props.jsonUIScrolls;
  const metric: unknown = Array.isArray(metrics) ? metrics[id] : undefined;

  if (typeof metric !== 'object' || metric === null || !('axis' in metric) || metric.axis !== 'y') { throw new Error('Experimental Ore requires a solved vertical Scroll viewport.'); }

  const read = (field: string): number => number(Reflect.get(metric, field));

  return { id, viewport: [read('x'), read('y'), read('width'), read('height')], extent: read('extent') };
}

function view(tree: JSX.Element, nodes: readonly OreNode[]): NonNullable<OreLayout['view']> {
  const uiScale = findRoot(tree)?.props.uiScale;

  if (uiScale !== undefined && (typeof uiScale !== 'number' || !Number.isFinite(uiScale) || uiScale <= 0 || uiScale > 16)) { throw new Error('Ore uiScale must be greater than zero and at most 16.'); }

  nodes = nodes.filter(node => !node.region);
  const x = Math.min(...nodes.map(node => node.rect[0])), y = Math.min(...nodes.map(node => node.rect[1]));
  const right = Math.max(...nodes.map(node => node.rect[0] + node.rect[2])), bottom = Math.max(...nodes.map(node => node.rect[1] + node.rect[3]));

  return { bounds: nodes.length ? [x, y, right - x, bottom - y] : [0, 0, CANONICAL_SCREEN.width, CANONICAL_SCREEN.height], ...uiScale === undefined ? {} : { uiScale: number(uiScale) } };
}

function textStyle(element: JSX.Element): NonNullable<OreNode['textStyle']> {
  const metrics = element.props.__textMetrics;
  const scale = typeof metrics === 'object' && metrics !== null && 'fontSize' in metrics ? metrics.fontSize : 1;
  const align = element.props.__textAlign ?? 'left';
  const color = element.props.__color;
  const font = element.props.fontType;

  if (font !== 'default' && font !== 'MinecraftTen') { throw new Error('Unsupported Ore font alias.'); }

  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0 || scale > 8) { throw new Error('Ore text scale must be greater than zero and at most 8.'); }

  if (align !== 'left' && align !== 'center' && align !== 'right') { throw new Error('Invalid Ore text alignment.'); }

  if (color !== undefined && (!Array.isArray(color) || color.length !== 3 || color.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1))) {
    throw new Error('Ore text color must contain three numbers in 0..1.');
  }

  return { scale, align, font, shadow: String(element.type).includes('shadow'), offset: [number(element.props.labelX ?? 0), number(element.props.labelY ?? 0)],
    ...color === undefined ? {} : { color: [number(color[0]), number(color[1]), number(color[2])] as const } };
}

function findRoot(tree: JSX.Element): JSX.Element | undefined {
  return tree.type === EXPERIMENTAL_ORE_TYPE ? tree : childElements(tree.props.children).map(findRoot).find(value => value !== undefined);
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) { throw new Error('Ore layout requires finite solved geometry.'); }

  return value;
}

export function oreValues(tree: JSX.Element, layout: OreLayout): OreValue[] {
  const entries = oreElements(tree);

  if (entries.length !== layout.nodes.length || entries.some(({ id, element }, index) => layout.nodes[index].id !== id || layout.nodes[index].kind !== kind(element))) { throw new Error('Ore screen structure changed; compile fixed controls and use visible instead.'); }

  if (entries.some(({ region, scroll }, index) => (layout.nodes[index].region ?? 0) !== region
    || scroll !== layout.nodes[index].scroll?.id)) {
    throw new Error('Ore scroll ownership changed from the compiled layout.');
  }

  if (entries.some(({ element }, index) => JSON.stringify(oreField(element) && { ...oreField(element), surfaces: Object.fromEntries(Object.entries(oreField(element)!.surfaces ?? {}).map(([key, source]) => [key, textureSource(source)])) }) !== JSON.stringify(layout.nodes[index].field))) { throw new Error('Ore field configuration changed from the compiled layout.'); }

  if (JSON.stringify(view(tree, layout.nodes)) !== JSON.stringify(layout.view)) { throw new Error('Ore presentation scale changed from the compiled layout. Use a fixed uiScale.'); }

  if (entries.some(({ element }, index) => element.type === IMAGE_TYPE && !layout.nodes[index].live && imageSource(element) !== layout.nodes[index].source)) {
    throw new Error('Ore image texture changed from the compiled layout. Use a static texture.');
  }

  return entries.map(({ id, element, visible, scroll }, index) => {
    const compiled = layout.nodes[index];
    const rect: OreNode['rect'] = [number(element.props.jsonUIx), number(element.props.jsonUIy), number(element.props.jsonUIWidth), number(element.props.jsonUIHeight)];
    const viewport = scroll === undefined ? undefined : scrollGeometry(tree, scroll);
    const style = isTextElementType(element.type) ? textStyle(element) : undefined;
    const formatting: [number, string][] = [];

    if (isTextElementType(element.type)) {
      for (const match of oreText(element, true).matchAll(/\u00a7(.)/g)) {
        const code = match[1].toLowerCase();

        if (!/^[0-9a-flor]$/.test(code)) { throw new Error('Unsupported Ore text formatting code: ' + code); }

        formatting.push([match.index - formatting.length * 2, code]);
      }
    }

    return { id, text: oreText(element), visible, enabled: element.type === SCROLL_SLOT_TYPE || element.props.enabled !== false,
      ...oreField(element) === undefined ? {} : { input: oreFieldValue(element, oreField(element)!) },
      ...rect.every((value, axis) => value === compiled.rect[axis]) ? {} : { rect },
      ...JSON.stringify(viewport) === JSON.stringify(compiled.scroll) ? {} : { scroll: viewport },
      ...JSON.stringify(style) === JSON.stringify(compiled.textStyle) ? {} : { textStyle: style },
      ...formatting.length ? { formatting } : {},
      ...element.type === 'selection-page-slot' && Array.isArray(element.props.selectionActiveIndexes) ? { selection: element.props.selectionActiveIndexes.map(Number) } : {},
      ...element.type === IMAGE_TYPE && compiled.live ? { source: imageSource(element) } : {},
      ...JSON.stringify(backgrounds(element)) === JSON.stringify(compiled.backgrounds) ? {} : { backgrounds: backgrounds(element) },
    };
  });
}

export function encodeOreState(state: OreState): string {
  const text = ORE_STATE_PREFIX + JSON.stringify(state);

  if (text.length > ORE_LIMIT) { throw new Error(`Ore state exceeds the ${ORE_LIMIT}-character observable limit.`); }

  return text;
}

/** Atomic observable frames; unchanged values are read from the compiled layout. */
export function oreStateFrame(state: OreState, layout: OreLayout): { carrier: string; parts: string[] } {
  const full = ORE_STATE_PREFIX + JSON.stringify(state);

  if (full.length <= ORE_LIMIT) { return { carrier: full, parts: [] }; }

  const baseline = new Map(layout.nodes.map(node => [node.id, node.initial]));
  const values = state.values.filter(value => JSON.stringify(value) !== JSON.stringify(baseline.get(value.id)));
  const text = ORE_STATE_PREFIX + JSON.stringify({ ...state, values });

  if (text.length <= ORE_LIMIT) { return { carrier: text, parts: [] }; }

  const size = ORE_LIMIT - 100;
  const chunks: string[] = [];

  for (let start = 0; start < text.length;) {
    let end = Math.min(start + size, text.length);
    const last = text.charCodeAt(end - 1);

    if (end < text.length && last >= 0xd800 && last <= 0xdbff) { end--; }

    chunks.push(text.slice(start, end)); start = end;
  }

  const count = chunks.length;

  if (count > ORE_FRAME_PARTS) { throw new Error(`Ore state exceeds ${ORE_FRAME_PARTS} observable parts.`); }

  return {
    carrier: ORE_STATE_PREFIX + JSON.stringify({ schema: 'core-ore-frame/1', session: state.session, revision: state.revision,
      transport: state.transport, screen: state.screen, asset: state.asset, title: state.title, parts: count }),
    parts: chunks.map((chunk, index) => ORE_PART_PREFIX + state.session + ':' + state.revision + ':' + index + '|' + chunk),
  };
}
