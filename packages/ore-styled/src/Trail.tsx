/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel, Text, useTranslationResolver } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { theme } from './tokens';

export interface TrailProps extends ControlProps {
  /**
   * The whole trail as ONE value, drawn by one label: what a screen whose trail
   * is only known when it is shown wears. `trailText` composes one, and the
   * client resolves it in the reader's own language.
   */
  text?: DisplayText;
  /**
   * Characters the trail reserves, which is what makes the label live: a
   * compiled screen keeps one entry for it and shows whatever it is sent.
   * `trailMaxLength` derives it from the room the header's controls leave.
   */
  maxLength?: number;
  /**
   * A trail known at build time, in place of `text`: one baked label per
   * segment, so each key still resolves on the client. A trail that is one
   * label has to be composed by whoever knows what it says, which a baked
   * trail's author already did.
   */
  segments?: readonly DisplayText[];
}

/**
 * The breadcrumb trail every header wears, as a row of its own so any screen
 * can show one: `title > scope > entity`, the separators in the trail's
 * lighter colour.
 *
 * The row is a stack of hugging labels: a trail's text is only known when the
 * screen is shown, so the box a compiled screen solved for it would be as wide
 * as the longest name it may ever hold and every shorter one would leave the
 * rest as air. A label draws at the width of its glyphs, the engine packs
 * them, and the stack hangs from the middle of the header — so the trail is
 * centred on what it actually says.
 *
 * A LIVE trail is one label. The client resolves a message on a form entry
 * before the binding sees it, so every segment travels together and the
 * composition — including which segments were dropped to make it fit — is
 * decided by the server that knows what they say.
 *
 * A BAKED trail is one label per segment, because a baked label can hold one
 * key and no more: the build would otherwise have to resolve the segments
 * itself and freeze its own language into the pack.
 */
export function Trail({ text, maxLength, segments, ...layout }: TrailProps): JSX.Element {
  const resolver = useTranslationResolver();
  const { font, scale, color, colorRgb, separator } = theme.components.header.textStyle;

  const isLiteral = (value: DisplayText): value is string => typeof value === 'string' && resolver?.(value) === undefined;

  // A literal takes the trail colour as a code; a key takes it through the
  // label, since a code in front of a key stops it resolving.
  const baked = (segments ?? []).flatMap((segment, index): JSX.Element[] => [
    ...index === 0
      ? []
      : [<Text font={font} scale={scale} hug={true}>{`${separator} > `}</Text>],
    <Text
      font={font}
      scale={scale}
      maxLines={1}
      hug={true}
      color={isLiteral(segment) ? undefined : colorRgb}
    >
      {isLiteral(segment) ? `${color}${segment}` : segment}
    </Text>,
  ]);

  return (
    <Panel stack={true} flexDirection={'row'} justifyContent={'center'} alignItems={'center'} {...layout}>
      {segments === undefined
        ? (
            // No colour on the label: a composed trail carries the trail's own
            // codes between its parts, one per segment and one per separator.
            <Text font={font} scale={scale} hug={true} {...maxLength === undefined ? {} : { maxLength }}>
              {text ?? ''}
            </Text>
          )
        : baked}
    </Panel>
  );
}
