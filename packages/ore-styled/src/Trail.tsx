/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel, Text, useComposed } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { theme } from './tokens';
import { trailLine } from './trailComposition';

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
   * A trail known at build time, in place of `text`. The build composes it in
   * every language the pack ships, collapsed to the room the trail is laid out
   * with, and one label draws the client's own.
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
 * A BAKED trail is one label too, composed by the build for every language
 * from that language's strings and collapsed to the width the trail was laid
 * out at: which segments fit depends on what they say, and what they say is
 * different in every language.
 */
export function Trail({ text, maxLength, segments, ...layout }: TrailProps): JSX.Element {
  const { font, scale } = theme.components.header.textStyle;
  const composed = useComposed((resolve, width) => trailLine(segments ?? [], resolve, width));

  return (
    <Panel stack={true} flexDirection={'row'} justifyContent={'center'} alignItems={'center'} {...layout} {...segments === undefined ? {} : composed.box}>
      {segments === undefined
        ? (
            // No colour on the label: a composed trail carries the trail's own
            // codes between its parts, one per segment and one per separator.
            <Text font={font} scale={scale} hug={true} {...maxLength === undefined ? {} : { maxLength }}>
              {text ?? ''}
            </Text>
          )
        : <Text font={font} scale={scale} hug={true} {...composed.text} />}
    </Panel>
  );
}
