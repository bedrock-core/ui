/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import { Image, Panel, Scroll, Text, type JSX } from '@bedrock-core/ui-runtime';
import { GuideBlockList } from '../render/GuideBlockList';
import { GuideHeader, type BreadcrumbSegment } from '../render/GuideHeader';
import type { GuideComponents, GuideManifest, GuideTreeNode, PageId } from '../types';

const { spacing } = theme.tokens;

const ICON_HOME = 'textures/ui/config/home';

/** Category labels (DFS ancestry) leading to `pageId`, or `[]` if not found in the tree. */
function breadcrumbPath(tree: GuideTreeNode[], pageId: PageId): BreadcrumbSegment[] {
  const walk = (nodes: GuideTreeNode[]): BreadcrumbSegment[] | undefined => {
    for (const node of nodes) {
      if (node.t === 'page') {
        if (node.id === pageId) { return [{ key: node.titleK }]; }

        continue;
      }

      const nested = walk(node.children);

      if (nested) { return [{ key: node.labelK }, ...nested]; }
    }

    return undefined;
  };

  return walk(tree) ?? [];
}

export interface GuidePageViewProps {
  manifest: GuideManifest;
  pageId: PageId;
  /** Header title (raw text, colorable). */
  title: string;
  /** Component registry for MDX `cmp` blocks. */
  components?: GuideComponents;
  /** A prev/next/link press — navigate to another page in place. */
  onOpenPage: (pageId: PageId) => void;
  /** Back to the guide home (header back + footer home button). */
  onHome: () => void;
  /** Close the whole UI (the header's × button). */
  onClose: () => void;
}

/** One guide page: title, rendered blocks, prev/home/next footer. */
export function GuidePageView({ manifest, pageId, title, components, onOpenPage, onHome, onClose }: GuidePageViewProps): JSX.Element {
  const page = manifest.pages[pageId];

  const prevPage = page?.prev !== undefined ? manifest.pages[page.prev] : undefined;
  const nextPage = page?.next !== undefined ? manifest.pages[page.next] : undefined;
  const breadcrumbs = breadcrumbPath(manifest.tree, pageId);

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <GuideHeader title={title} breadcrumbs={breadcrumbs} onBack={onHome} onClose={onClose} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll marginRight={spacing.md}>
          <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
            {page
              ? (
                  <Panel flexDirection={'column'} gap={spacing.md}>
                    <Text font={'minecraftTen'} scale={2} shadow={true} wordBreak={'break-word'} localizationKey={page.titleK} />
                    <GuideBlockList blocks={page.blocks} ns={manifest.ns} onNavigate={onOpenPage} components={components} />
                  </Panel>
                )
              : <Text>{'§cPage not found.'}</Text>}
          </Panel>
        </Scroll>
      </Panel>
      <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm} padding={spacing.sm}>
        {page?.prev !== undefined && prevPage
          ? (
              <OreButton variant={'contrast'} flexGrow={1} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={(): void => onOpenPage(prevPage.id)}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text>{'§7<'}</Text>
                  <Text localizationKey={prevPage.titleK} />
                </Panel>
              </OreButton>
            )
          : <Panel flexGrow={1} />}
        <OreButton variant={'contrast'} padding={spacing.xs} onPress={onHome}>
          <Image width={12} height={12} texture={ICON_HOME} />
        </OreButton>
        {page?.next !== undefined && nextPage
          ? (
              <OreButton variant={'contrast'} flexGrow={1} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={(): void => onOpenPage(nextPage.id)}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text localizationKey={nextPage.titleK} />
                  <Text>{'§7>'}</Text>
                </Panel>
              </OreButton>
            )
          : <Panel flexGrow={1} />}
      </Panel>
    </Card>
  );
}
