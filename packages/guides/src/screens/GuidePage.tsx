/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import type { NavigationHelpers, RouteObject } from '@bedrock-core/navigation';
import { Image, Panel, Scroll, Text, useEffect, useExit, useState, type JSX } from '@bedrock-core/ui-runtime';
import { GuideBlockList } from '../render/GuideBlockList';
import { GuideHeader, type BreadcrumbSegment } from '../render/GuideHeader';
import type { GuideSource } from '../source';
import type { GuidePageData, GuideRoutes, GuideTreeNode, PageId } from '../types';
import type { GuideScreenOptions } from './GuideHome';

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

export interface GuidePageScreenProps {
  navigation: NavigationHelpers<GuideRoutes>;
  route: RouteObject<GuideRoutes['GuidePage']>;
  source: GuideSource;
  options: GuideScreenOptions;
}

/** One guide page: title, rendered blocks, prev/home/next footer. */
export function GuidePageScreen({ navigation, route, source, options }: GuidePageScreenProps): JSX.Element {
  const { pageId, addonId } = route.params;
  const manifest = source.get(addonId);
  const exit = useExit();

  // Async sources (Phase 2 cross-addon RPC) fetch page bodies on demand; the
  // `id` tag discards stale results after prev/next navigation.
  const usesAsync = typeof source.getPage === 'function';
  const [fetched, setFetched] = useState<{ id: PageId; page: GuidePageData | undefined } | undefined>(undefined);

  useEffect(() => {
    if (!usesAsync) { return; }

    let live = true;

    void Promise.resolve(source.getPage?.(addonId, pageId)).then((page) => {
      if (live) { setFetched({ id: pageId, page }); }
    });

    return (): void => {
      live = false;
    };
  }, [pageId, addonId]);

  const loading = usesAsync && fetched?.id !== pageId;
  const page = usesAsync
    ? (fetched?.id === pageId ? fetched.page : undefined)
    : manifest?.pages[pageId];

  const goTo = (id: PageId): void => {
    // navigate() merges params into the existing GuidePage entry (pop-to
    // semantics), so prev/next/links re-render in place — no stack growth.
    navigation.navigate('GuidePage', { pageId: id, addonId });
  };

  const openHome = (): void => {
    navigation.navigate('GuideHome', { addonId });
  };

  const prevPage = page?.prev !== undefined ? manifest?.pages[page.prev] : undefined;
  const nextPage = page?.next !== undefined ? manifest?.pages[page.next] : undefined;
  const breadcrumbs = manifest ? breadcrumbPath(manifest.tree, pageId) : [];

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <GuideHeader
        title={options.title ?? 'Guide'}
        breadcrumbs={breadcrumbs}
        onBack={navigation.canGoBack() ? (): void => navigation.goBack() : undefined}
        onClose={exit}
      />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll marginRight={spacing.md}>
          <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
            {loading
              ? <Text>{'§7Loading...'}</Text>
              : page
                ? (
                    <Panel flexDirection={'column'} gap={spacing.md}>
                      <Text font={'minecraftTen'} scale={2} shadow={true} wordBreak={'break-word'} localizationKey={page.titleK} />
                      <GuideBlockList blocks={page.blocks} ns={manifest?.ns ?? ''} onNavigate={goTo} components={options.components} />
                    </Panel>
                  )
                : <Text>{'§cPage not found.'}</Text>}
          </Panel>
        </Scroll>
      </Panel>
      <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm} padding={spacing.sm}>
        {page?.prev !== undefined && prevPage
          ? (
              <OreButton variant={'contrast'} flexGrow={1} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={(): void => goTo(prevPage.id)}>
                <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs}>
                  <Text>{'§7<'}</Text>
                  <Text localizationKey={prevPage.titleK} />
                </Panel>
              </OreButton>
            )
          : <Panel flexGrow={1} />}
        <OreButton variant={'contrast'} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={openHome}>
          <Image width={12} height={12} texture={ICON_HOME} />
        </OreButton>
        {page?.next !== undefined && nextPage
          ? (
              <OreButton variant={'contrast'} flexGrow={1} paddingTop={spacing.sm} paddingBottom={spacing.sm} onPress={(): void => goTo(nextPage.id)}>
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
