/** @jsxImportSource @bedrock-core/ui-runtime */
import { theme } from '@bedrock-core/ore-styled';
import { Fragment, JSX, Panel, Text } from '@bedrock-core/ui';
import { i18n } from '../i18n';
import type { TextFont } from '@bedrock-core/ui/components/Text';

const { key } = i18n;

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DIGITS = '(0123456789)';
const PUNCT = '!@#$%&*()_+-=[]{}|;:\'",.<>/?';
const NARROW = 'iIlL1.,;:!|';

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

function FontMetricsSection({ font, label }: { font: TextFont; label: string }): JSX.Element {
  return (
    <Fragment>
      <Text>{`§e§l=== ${label}: glyphs ===`}</Text>

      <Text>{'§7scale=0.5'}</Text>
      <GlyphRows font={font} scale={0.5} prefix={''} />
      <GlyphRows font={font} scale={0.5} prefix={'§l'} />

      <Text>{'§7scale=1 (default)'}</Text>
      <GlyphRows font={font} prefix={''} />
      <GlyphRows font={font} prefix={'§l'} />
      <GlyphRows font={font} prefix={'§o'} />
      <GlyphRows font={font} prefix={'§l§o'} />

      <Text>{'§7scale=2'}</Text>
      <GlyphRows font={font} scale={2} prefix={''} />
      <GlyphRows font={font} scale={2} prefix={'§l'} />

      <Text>{'§7scale=4'}</Text>
      <GlyphRows font={font} scale={4} prefix={''} />
      <GlyphRows font={font} scale={4} prefix={'§l'} />

      <Text>{`§e§l=== ${label}: localizationKey ===`}</Text>

      <Text>{'§7plain (no wrap)'}</Text>
      <Text font={font} localizationKey={key($ => $.test.long)} />

      <Text>{'§7word-wrap'}</Text>
      <Text font={font} localizationKey={key($ => $.test.long)} wordBreak={'break-word'} />

      <Text>{'§7bold word-wrap'}</Text>
      <Text font={font} localizationKey={key($ => $.test.longBold)} wordBreak={'break-word'} />

      <Text>{'§7ellipsis'}</Text>
      <Text font={font} localizationKey={key($ => $.test.long)} overflow={'ellipsis'} />

      <Text>{'§7scale=2 word-wrap'}</Text>
      <Text font={font} scale={2} localizationKey={key($ => $.test.long)} wordBreak={'break-word'} />

      <Text>{'§7scale=2 ellipsis'}</Text>
      <Text font={font} scale={2} localizationKey={key($ => $.test.long)} overflow={'ellipsis'} />

      <Text>{'§7maxLines=2 ellipsis'}</Text>
      <Text font={font} localizationKey={key($ => $.test.multiline)} wordBreak={'break-word'} overflow={'ellipsis'} maxLines={2} />

      <Text>{'§7maxLines=3'}</Text>
      <Text font={font} localizationKey={key($ => $.test.multiline)} wordBreak={'break-word'} maxLines={3} />

      <Text>{'§7scale=2 maxLines=2 ellipsis'}</Text>
      <Text font={font} scale={2} localizationKey={key($ => $.test.multiline)} wordBreak={'break-word'} overflow={'ellipsis'} maxLines={2} />
    </Fragment>
  );
}

export function FontMetrics(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={theme.tokens.spacing.md} gap={theme.tokens.spacing.lg} background={theme.components.card.variants.default.textures.background}>
      <FontMetricsSection font={'mojangles'} label={'mojangles'} />
      <FontMetricsSection font={'minecraftTen'} label={'minecraftTen'} />
    </Panel>
  );
}
