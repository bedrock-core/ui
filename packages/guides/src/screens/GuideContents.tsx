/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, theme } from '@bedrock-core/ore-styled';
import type { NavigationHelpers, RouteObject } from '@bedrock-core/navigation';
import { Button, Panel, Scroll, Text, useExit, useState, type JSX } from '@bedrock-core/ui-runtime';
import { GuideHeader } from '../render/GuideHeader';
import type { GuideSource } from '../source';
import type { GuideRoutes, GuideTreeNode, PageId } from '../types';

const { spacing } = theme.tokens;

export interface GuideScreenOptions {
  /** Header title (raw text, colorable). Defaults to 'Guide'. */
  title?: string;
  /** Component registry for MDX `cmp` blocks. */
  components?: import('../types').GuideComponents;
}

export interface GuideContentsScreenProps {
  navigation: NavigationHelpers<GuideRoutes>;
  route: RouteObject<GuideRoutes['GuideContents']>;
  source: GuideSource;
  options: GuideScreenOptions;
}

/** Category ids marked `collapsed: true` in the manifest start collapsed. */
function initialCollapsed(tree: GuideTreeNode[]): string[] {
  const ids: string[] = [];

  const walk = (nodes: GuideTreeNode[]): void => {
    for (const node of nodes) {
      if (node.t === 'cat') {
        if (node.collapsed === true) { ids.push(node.id); }

        walk(node.children);
      }
    }
  };

  walk(tree);

  return ids;
}

/** Sidebar tree — the guide's table of contents. */
export function GuideContentsScreen({ navigation, route, source, options }: GuideContentsScreenProps): JSX.Element {
  const addonId = route.params?.addonId;
  const manifest = source.get(addonId);
  const exit = useExit();
  const [collapsed, setCollapsed] = useState<string[]>(manifest ? initialCollapsed(manifest.tree) : []);

  if (!manifest) {
    return (
      <Card flexDirection={'column'} gap={spacing.sm}>
        <Text>{'§cNo guide available.'}</Text>
      </Card>
    );
  }

  const toggle = (id: string): void => {
    setCollapsed(collapsed.includes(id) ? collapsed.filter(c => c !== id) : [...collapsed, id]);
  };

  const openPage = (pageId: PageId): void => {
    navigation.navigate('GuidePage', { pageId, addonId });
  };

  const rows: JSX.Element[] = [];

  const walk = (nodes: GuideTreeNode[], depth: number): void => {
    for (const node of nodes) {
      if (node.t === 'page') {
        rows.push(
          <Button paddingTop={spacing.md} paddingBottom={spacing.md} paddingLeft={spacing.sm} paddingRight={spacing.sm} width={'100%'} justifyContent={'flex-start'} onPress={(): void => openPage(node.id)}>
            <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs} paddingLeft={depth * spacing.md}>
              <Text localizationKey={node.titleK} />
            </Panel>
          </Button>,
        );
        continue;
      }

      const isCollapsed = collapsed.includes(node.id);

      rows.push(
        <Button paddingTop={spacing.md} paddingBottom={spacing.md} paddingLeft={spacing.sm} paddingRight={spacing.sm} width={'100%'} justifyContent={'flex-start'} onPress={(): void => toggle(node.id)}>
          <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.xs} paddingLeft={depth * spacing.md}>
            <Text>{isCollapsed ? '§8+' : '§8-'}</Text>
            <Text shadow={true} localizationKey={node.labelK} />
          </Panel>
        </Button>,
      );

      if (!isCollapsed) { walk(node.children, depth + 1); }
    }
  };

  walk(manifest.tree, 0);

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <GuideHeader
        title={options.title ?? 'Guide'}
        onBack={navigation.canGoBack() ? (): void => navigation.goBack() : undefined}
        onClose={exit}
      />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'}>
            {rows}
          </Panel>
        </Scroll>
      </Panel>
    </Card>
  );
}
