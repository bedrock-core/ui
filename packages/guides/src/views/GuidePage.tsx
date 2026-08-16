/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import { Image, Panel, Scroll, Text, type JSX } from '@bedrock-core/ui-runtime';
import { GuideBlockList } from '../render/GuideBlockList';
import type { GuideComponents, GuideManifest, GuideTreeNode, PageId } from '../types';

const { spacing } = theme.tokens;

const ICON_INDEX = 'textures/ui/config/menu';

/** Category labels (DFS ancestry) leading to `pageId`, or `[]` if not found in the tree. */
function breadcrumbPath(tree: GuideTreeNode[], pageId: PageId): DisplayText[] {
  const walk = (nodes: GuideTreeNode[]): DisplayText[] | undefined => {
    for (const node of nodes) {
      if (node.t === 'page') {
        if (node.id === pageId) { return [node.titleK]; }

        continue;
      }

      const nested = walk(node.children);

      if (nested) { return [node.labelK, ...nested]; }
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
  /**
   * Header back. Leaves this page for wherever the reader came from — the sidebar when there is
   * one, otherwise out of the guide entirely. Absent hides the control, for a root guide with
   * nowhere to go back to.
   */
  onBack?: () => void;

  /**
   * Footer index button. Set only when there IS an index: a single-page guide has no second page
   * to choose between, so the button would either lead to a one-row table of contents or, worse,
   * duplicate the back button while looking like something else.
   */
  onHome?: () => void;
  /** Close the whole UI (the header's × button). */
  onClose: () => void;
}

/** One guide page: title, rendered blocks, prev/home/next footer. */
export function GuidePageView({ manifest, pageId, title, components, onOpenPage, onBack, onHome, onClose }: GuidePageViewProps): JSX.Element {
  const page = manifest.pages[pageId];

  if (!page) {
    // A silent fallback is undiagnosable in the field — name the miss in the
    // content log: which id was asked for, which manifest, and what it carries.
    // Reaching this means the id came from somewhere the manifest no longer
    // backs: a stale open-page state across a live re-publish, or a link/tree
    // entry whose page didn't compile (the guides filter warns at build time).
    console.warn(
      `[guides] page "${pageId}" not found in the "${manifest.ns}" manifest — it has: ${Object.keys(manifest.pages).join(', ') || '(no pages)'}`,
    );
  }

  const prevPage = page?.prev !== undefined ? manifest.pages[page.prev] : undefined;
  const nextPage = page?.next !== undefined ? manifest.pages[page.next] : undefined;
  const breadcrumbs = breadcrumbPath(manifest.tree, pageId);

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header title={title} breadcrumbs={breadcrumbs} onBack={onBack} onClose={onClose} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll marginRight={spacing.md}>
          <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
            {page
              ? (
                  <Panel flexDirection={'column'} gap={spacing.md}>
                    <Text font={'minecraftTen'} scale={2} shadow={true} wordBreak={'break-word'}>{page.titleK}</Text>
                    <GuideBlockList blocks={page.blocks} ns={manifest.ns} onNavigate={onOpenPage} components={components} />
                  </Panel>
                )
              : <Text>{'§cPage not found.'}</Text>}
          </Panel>
        </Scroll>
      </Panel>
      {/* `stretch` + `height: '100%'`, so the index button takes whatever height the prev/next
          labels give the row and `aspectRatio` squares the width against it. The percent height
          is load-bearing: with both axes auto the ratio drives from WIDTH, which would size the
          button to its 12px icon. */}
      <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.sm} padding={spacing.sm}>
        {page?.prev !== undefined && prevPage
          ? (
              <OreButton variant={'contrast'} flexGrow={1} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={(): void => onOpenPage(prevPage.id)}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text>{'§7<'}</Text>
                  <Text>{prevPage.titleK}</Text>
                </Panel>
              </OreButton>
            )
          : <Panel flexGrow={1} />}
        {onHome
          ? (
              <OreButton variant={'contrast'} height={'100%'} aspectRatio={1} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} onPress={onHome}>
                <Image width={12} height={12} texture={ICON_INDEX} />
              </OreButton>
            )
          : null}
        {page?.next !== undefined && nextPage
          ? (
              <OreButton variant={'contrast'} flexGrow={1} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={(): void => onOpenPage(nextPage.id)}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text>{nextPage.titleK}</Text>
                  <Text>{'§7>'}</Text>
                </Panel>
              </OreButton>
            )
          : <Panel flexGrow={1} />}
      </Panel>
    </Card>
  );
}
