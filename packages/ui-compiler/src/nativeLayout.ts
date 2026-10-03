import type { FlexStyle } from '@bedrock-core/flexbox';
import type { Anchor, Measure } from './jsonui';

/** Geometry that must stay relative until Bedrock lays out its parent. */
export interface NativeLayout {
  size?: [Measure, Measure];
  offset?: [Measure, Measure];
  anchor?: Anchor;
}

export const percent = (value: unknown): value is `${number}%` =>
  typeof value === 'string' && /^\d+(?:\.\d+)?%$/.test(value);

const numberOrZero = (value: number | string | undefined): number =>
  typeof value === 'number' ? value : 0;

/** A screen root is mounted under a host-sized control, so its authored percentage has a native parent. */
export function nativeRootSize(style: FlexStyle, solved: { width: number; height: number }): NativeLayout | undefined {
  if (!percent(style.width) && !percent(style.height)) {
    return undefined;
  }

  if (style.minWidth !== undefined || style.maxWidth !== undefined
    || style.minHeight !== undefined || style.maxHeight !== undefined) {
    throw new Error('Responsive root size with min/max constraints is not supported yet.');
  }

  if (style.width === undefined || style.height === undefined) {
    throw new Error('A responsive root needs an explicit width and height.');
  }

  if ([style.margin, style.marginTop, style.marginRight, style.marginBottom, style.marginLeft]
    .some(value => value !== undefined && value !== 0)
    || style.top !== undefined || style.right !== undefined
    || style.bottom !== undefined || style.left !== undefined) {
    throw new Error('Responsive root margins and edge positioning are not supported yet.');
  }

  return { size: [percent(style.width) ? style.width : solved.width, percent(style.height) ? style.height : solved.height] };
}

/** Preserve authored percentages and edge positioning when native JSON UI can express them. */
export function nativeLayout(style: FlexStyle, solved: { width: number; height: number; x: number; y: number }): NativeLayout | undefined {
  const width = percent(style.width) ? style.width : solved.width;
  const height = percent(style.height) ? style.height : solved.height;
  const hasPercent = percent(style.width) || percent(style.height);
  const positioned = style.position === 'absolute';
  const xEdge = style.left !== undefined ? 'left' : style.right !== undefined ? 'right' : undefined;
  const yEdge = style.top !== undefined ? 'top' : style.bottom !== undefined ? 'bottom' : undefined;

  if (!hasPercent && (!positioned || xEdge === undefined || yEdge === undefined)) {
    return undefined;
  }

  if (style.minWidth !== undefined || style.maxWidth !== undefined
    || style.minHeight !== undefined || style.maxHeight !== undefined) {
    throw new Error('Responsive panel size with min/max constraints is not supported yet.');
  }

  if (hasPercent && (style.width === undefined || style.height === undefined || style.aspectRatio !== undefined)) {
    throw new Error('A percentage-sized Panel needs explicit width and height without aspectRatio.');
  }

  if (!positioned || xEdge === undefined || yEdge === undefined) {
    throw new Error('Responsive percentages require absolute positioning with one horizontal and one vertical inset.');
  }

  if ((style.left !== undefined && style.right !== undefined)
    || (style.top !== undefined && style.bottom !== undefined)) {
    throw new Error('Responsive positioning with two insets on one axis is not supported yet.');
  }

  if ([style.margin, style.marginTop, style.marginRight, style.marginBottom, style.marginLeft]
    .some(value => typeof value === 'string')) {
    throw new Error('Responsive absolute positioning with percentage margins is not supported yet.');
  }

  const anchor = `${yEdge === 'top' ? 'top' : 'bottom'}_${xEdge}` as Anchor;
  const x = xEdge === 'left'
    ? style.left! + numberOrZero(style.marginLeft ?? style.margin)
    : -style.right! - numberOrZero(style.marginRight ?? style.margin);
  const y = yEdge === 'top'
    ? style.top! + numberOrZero(style.marginTop ?? style.margin)
    : -style.bottom! - numberOrZero(style.marginBottom ?? style.margin);

  return { size: [width, height], anchor, offset: [x, y] };
}
