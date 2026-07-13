/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import { Fragment, Image, Panel, Text, type JSX } from '@bedrock-core/ui-runtime';
import { defaultAdmonitionTitleKey } from '../admonitions';
import type { GuideBlock, GuideComponents, GuideListItem, GuideRun, PageId } from '../types';

const { spacing } = theme.tokens;

/** Guide body images never render taller than this — keeps a large/square source image icon-sized instead of dominating the page. */
const IMAGE_MAX_HEIGHT = 120;

export interface GuideBlockListProps {
  blocks: GuideBlock[];
  /** Manifest namespace — resolves default admonition title keys. */
  ns: string;
  /** Internal-link presses land here (usually `navigate('GuidePage', …)`). */
  onNavigate?: (pageId: PageId) => void;
  /** Registry for MDX `cmp` blocks; unregistered names render a placeholder. */
  components?: GuideComponents;
}

/**
 * Renders guide IR blocks with existing primitives. All prose renders through
 * `localizationKey` (the filter compiled it into .lang values), so the client
 * resolves text per player language and wraps it natively.
 */
export function GuideBlockList({ blocks, ns, onNavigate, components }: GuideBlockListProps): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.md}>
      {blocks.map(block => renderBlock(block, { ns, onNavigate, components }))}
    </Panel>
  );
}

interface RenderCtx {
  ns: string;
  onNavigate?: (pageId: PageId) => void;
  components?: GuideComponents;
}

function renderBlock(block: GuideBlock, ctx: RenderCtx): JSX.Element {
  switch (block.t) {
    case 'h':
      return block.l === 1
        ? <Text font={'minecraftTen'} scale={4} shadow={false} wordBreak={'break-word'} marginTop={spacing.sm} localizationKey={block.k} />
        : <Text font={'mojangles'} scale={block.l === 2 ? 1.5 : 1.25} shadow={true} wordBreak={'break-word'} marginTop={spacing.sm} localizationKey={block.k} />;

    case 'p':
      return renderRuns(block.runs, ctx);

    case 'ul':
      return renderList(block.items, undefined, ctx);

    case 'ol':
      return renderList(block.items, block.start ?? 1, ctx);

    case 'img':
      // Height-capped + aspect-ratio-derived width: a wide screenshot still reads
      // close to full column width, but a square/tall icon doesn't stretch to fill
      // the column and dominate the page (100%-width forced a 2048×2048 pack icon
      // to render as a huge square between paragraphs).
      return block.w !== undefined && block.h !== undefined
        ? <Image texture={block.src} height={Math.min(block.h, IMAGE_MAX_HEIGHT)} aspectRatio={block.w / block.h} alignSelf={'center'} />
        : <Image texture={block.src} width={'100%'} height={40} />;

    case 'adm':
      return (
        <Card variant={'dark'} flexDirection={'column'} gap={spacing.sm}>
          <Text shadow={true} localizationKey={block.titleK ?? defaultAdmonitionTitleKey(ctx.ns, block.kind)} />
          <GuideBlockList blocks={block.blocks} ns={ctx.ns} onNavigate={ctx.onNavigate} components={ctx.components} />
        </Card>
      );

    case 'code':
      return (
        <Card variant={'dark'} flexDirection={'column'} gap={0} padding={spacing.sm}>
          {block.lines.map(line => <Text>{`§7${line === '' ? ' ' : line}`}</Text>)}
        </Card>
      );

    case 'hr':
      return <Divider />;

    case 'cmp': {
      const Component = ctx.components?.[block.name];

      if (!Component) {
        return (
          <Card variant={'dark'}>
            <Text>{`§8[unsupported content: ${block.name}]`}</Text>
          </Card>
        );
      }

      return (
        <Component {...block.props}>
          {block.blocks
            ? <GuideBlockList blocks={block.blocks} ns={ctx.ns} onNavigate={ctx.onNavigate} components={ctx.components} />
            : undefined}
        </Component>
      );
    }
  }
}

/**
 * A paragraph/list-item's runs as one flowing, wrapping row: plain runs are
 * inline text, a run with `to` is a transparent (invisible-until-hovered)
 * button positioned right where the link text sits — an inline pressable
 * link, not decorative text plus a detached button underneath.
 */
function renderRuns(runs: GuideRun[], ctx: RenderCtx): JSX.Element {
  return (
    <Panel flexDirection={'row'} wrap={'wrap'} alignItems={'center'}>
      {runs.map((run) => {
        const { to } = run;

        return to !== undefined
          ? (
              <OreButton
                variant={'transparent'}
                paddingTop={0}
                paddingBottom={0}
                paddingLeft={2}
                paddingRight={-2}
                onPress={(): void => ctx.onNavigate?.(to)}
              >
                <Text shadow={true} wordBreak={'break-word'} localizationKey={run.k} />
              </OreButton>
            )
          : <Text shadow={true} wordBreak={'break-word'} localizationKey={run.k} />;
      })}
    </Panel>
  );
}

function renderList(items: GuideListItem[], start: number | undefined, ctx: RenderCtx, depth = 0): JSX.Element {
  return (
    <Panel flexDirection={'column'} gap={spacing.xs} marginLeft={depth * spacing.md}>
      {items.map((item, i) => (
        <Fragment>
          <Panel flexDirection={'row'} gap={spacing.xs} alignItems={'flex-start'}>
            <Text>{start === undefined ? '§7•' : `§7${start + i}.`}</Text>
            <Panel flexGrow={1} flexShrink={1}>
              {renderRuns(item.runs, ctx)}
            </Panel>
          </Panel>
          {item.items && item.items.length > 0
            ? renderList(item.items, undefined, ctx, depth + 1)
            : undefined}
        </Fragment>
      ))}
    </Panel>
  );
}
