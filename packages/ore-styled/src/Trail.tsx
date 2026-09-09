/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel, Text, useTranslationResolver } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { theme } from './tokens';

/**
 * One segment of a trail: what it says, and how many characters it reserves
 * when it is only known at show time. A segment with `maxLength` is live; a
 * compiled screen keeps its box and shows whatever it is sent — a key the
 * client resolves, or a literal. Without it the segment bakes.
 */
export type TrailSegment = DisplayText | { text: DisplayText; maxLength: number };

export interface TrailProps extends ControlProps {
  /** The segments in order, `a > b > c`. A live segment sent empty hides with its separator. */
  segments: readonly TrailSegment[];
}

const isLive = (segment: TrailSegment): segment is { text: DisplayText; maxLength: number } =>
  typeof segment === 'object' && 'maxLength' in segment;

const textOf = (segment: TrailSegment): DisplayText => (isLive(segment) ? segment.text : segment);

/**
 * The breadcrumb trail every header wears, as a row of its own so any screen
 * can show one: `title > scope > entity`, the separators in the trail's
 * lighter colour, the last segment the one that shrinks.
 *
 * Each segment is a `Text` of its own, so a key stays a key all the way to
 * the client and resolves in the player's language — one label cannot hold
 * two keys. A literal takes the trail colour as a code; a key or a live
 * segment is coloured through the label, since a code in front of a key
 * stops it resolving.
 */
export function Trail({ segments, ...layout }: TrailProps): JSX.Element {
  const resolver = useTranslationResolver();
  const { font, scale, color, colorRgb, separator } = theme.components.header.textStyle;

  const isLiteral = (value: DisplayText): value is string => typeof value === 'string' && resolver?.(value) === undefined;

  const parts = segments.flatMap((segment, index): JSX.Element[] => {
    const last = index === segments.length - 1;
    const live = isLive(segment);
    const text = textOf(segment);
    const shown = !live || (typeof text === 'string' ? text !== '' : true);

    return [
      ...index === 0
        ? []
        : [
            // A live segment's separator follows it: carried, so an empty segment takes no room.
            <Text font={font} scale={scale} flexShrink={0} visible={shown} liveVisible={live}>{`${separator} > `}</Text>,
          ],
      <Text
        font={font}
        scale={scale}
        maxLines={1}
        flexShrink={last ? 1 : 0}
        color={!live && isLiteral(text) ? undefined : colorRgb}
        {...live ? { maxLength: segment.maxLength } : {}}
      >
        {!live && isLiteral(text) ? `${color}${text}` : text}
      </Text>,
    ];
  });

  return (
    <Panel flexDirection={'row'} justifyContent={'center'} alignItems={'center'} {...layout}>
      {parts}
    </Panel>
  );
}
