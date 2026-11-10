import type { JSX } from '@bedrock-core/ui-runtime';
import { bakedWalk, hasTextChannel, isTextElementType, type Probe } from '@bedrock-core/ui-runtime/compile';

const MAX_TEXT_HINTS = 3;
const TEXT_PREVIEW_LIMIT = 80;

const quote = (value: string): string => JSON.stringify(value.length > TEXT_PREVIEW_LIMIT
  ? value.slice(0, TEXT_PREVIEW_LIMIT) + '…'
  : value);

/** Build-only guidance for live labels observed growing beyond their compiled width. */
export function liveTextWidthHints(probe: Probe, tree: JSX.Element): string[] {
  const elements = bakedWalk(tree);
  const details: string[] = [];

  for (const change of probe.geometry) {
    if (change.prop !== 'jsonUIWidth') { continue; }

    const element = elements[change.position];
    const before = Number(change.before);
    const after = Number(change.after);

    if (element === undefined || !isTextElementType(element.type) || !hasTextChannel(element)
      || !Number.isFinite(before) || !Number.isFinite(after) || after <= before) { continue; }

    const metrics = element.props.__textMetrics;
    const textMetrics = typeof metrics === 'object' && metrics !== null ? metrics : undefined;

    if (textMetrics !== undefined && Reflect.get(textMetrics, 'hug') === true) { continue; }

    const id = element.props.testId;
    const initial = textMetrics === undefined ? undefined : Reflect.get(textMetrics, 'resolvedText');
    const description = typeof id === 'string' ? ` testId=${quote(id)}` : '';
    const preview = typeof id === 'string' || typeof initial !== 'string'
      ? ''
      : initial === '' ? ' (initially empty)' : ` (initial text ${quote(initial)})`;

    details.push(`    <Text #${String(change.position)}${description}>${preview}: compiled width ${String(before)}px; a probed value needs ${String(after)}px.`);
  }

  if (details.length === 0) { return []; }

  return [
    ...details.slice(0, MAX_TEXT_HINTS),
    ...details.length > MAX_TEXT_HINTS ? [`    …and ${String(details.length - MAX_TEXT_HINTS)} more live label(s).`] : [],
    '  Reserve room for the widest expected value with `width` or `minWidth`.',
    '  `maxLength` limits text length, not layout width.',
  ];
}
