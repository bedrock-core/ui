import { Fragment, JSX, Panel, Text, TranslationKeysContext } from '@bedrock-core/ui';
import type { TextFont } from '@bedrock-core/ui/components/Text';
import translationKeys from '../data/translationKeys.generated.json';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DIGITS = '(0123456789)';
const PUNCT = '!@#$%&*()_+-=[]{}|;:\'",.<>/?';
const NARROW = 'iIlL1.,;:!|';

// ─── Glyph rows ────────────────────────────────────────────────────────────────

function GlyphRows({ prefix, font, scale }: { prefix: string; font: TextFont; scale?: number }): JSX.Element {
  return (
    <Fragment>
      <Text font={font} scale={scale} wordBreak={'break-word'}>{`${prefix}${ALPHA}`}</Text>
      <Text font={font} scale={scale} wordBreak={'break-word'}>{`${prefix}${DIGITS}`}</Text>
      <Text font={font} scale={scale} wordBreak={'break-word'}>{`${prefix}${PUNCT}`}</Text>
      <Text font={font} scale={scale} wordBreak={'break-word'}>{`${prefix}${NARROW}`}</Text>
    </Fragment>
  );
}

// ─── Mojangles glyph section ───────────────────────────────────────────────────

function MojanglesSection(): JSX.Element {
  const font: TextFont = 'mojangles';

  return (
    <Fragment>
      <Text>{`§e§l=== mojangles glyphs ===`}</Text>

      <Text>{'§7normal'}</Text>
      <GlyphRows font={font} prefix={''} />

      <Text>{'§7bold'}</Text>
      <GlyphRows font={font} prefix={'§l'} />

      <Text>{'§7italic'}</Text>
      <GlyphRows font={font} prefix={'§o'} />

      <Text>{'§7bold+italic'}</Text>
      <GlyphRows font={font} prefix={'§l§o'} />

      <Text>{'§7scale 2.0'}</Text>
      <GlyphRows font={font} scale={2.0} prefix={''} />

      <Text>{'§7scale 2.0 bold'}</Text>
      <GlyphRows font={font} scale={2.0} prefix={'§l'} />

      <Text>{'§7scale 4.0'}</Text>
      <GlyphRows font={font} scale={4.0} prefix={''} />
    </Fragment>
  );
}

// ─── Localization key section ──────────────────────────────────────────────────

function LocalizationKeySection(): JSX.Element {
  const font: TextFont = 'mojangles';

  return (
    <Fragment>
      <Text>{`§e§l=== localizationKey ===`}</Text>

      <Text>{'§7plain'}</Text>
      <Text localizationKey={'test.longstring'} />

      <Text>{'§7word-wrap'}</Text>
      <Text font={font} localizationKey={'test.longstring'} wordBreak={'break-word'} />

      <Text>{'§7bold word-wrap'}</Text>
      <Text font={font} localizationKey={'test.longstring.bold'} wordBreak={'break-word'} />

      <Text>{'§7ellipsis single line'}</Text>
      <Text font={font} localizationKey={'test.longstring'} overflow={'ellipsis'} />

      <Text>{'§7maxLines=2 + ellipsis'}</Text>
      <Text font={font} localizationKey={'test.multiline'} wordBreak={'break-word'} overflow={'ellipsis'} maxLines={2} />

      <Text>{'§7maxLines=3'}</Text>
      <Text font={font} localizationKey={'test.multiline'} wordBreak={'break-word'} maxLines={3} />

      <Text>{'§7scale 2.0 ellipsis'}</Text>
      <Text font={font} scale={2.0} localizationKey={'test.longstring'} overflow={'ellipsis'} />
    </Fragment>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export function FontMetricsTest(): JSX.Element {
  return (
    <TranslationKeysContext value={translationKeys}>
      <Panel flexDirection={'column'} gap={4} padding={4}>
        <MojanglesSection />
        <LocalizationKeySection />
      </Panel>
    </TranslationKeysContext>
  );
}
