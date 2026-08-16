/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Header, MenuRow, theme } from '@bedrock-core/ore-styled';
import { Button, Image, Panel, Scroll, Text, useState, type JSX } from '@bedrock-core/ui-runtime';
import type { GuideManifest, GuideTreeNode, PageId } from '../types';

const { spacing } = theme.tokens;
const transparentTextures = theme.components.button.variants.transparent.textures;

/** Row/section thumbnail edge (px) for authored `icon` textures. */
const ICON_SIZE = 16;

export interface GuideHomeViewProps {
  manifest: GuideManifest;
  /** Header title (raw text, colorable). */
  title: string;
  /** A page row was pressed. */
  onOpenPage: (pageId: PageId) => void;
  /** Leave the guide entirely (host `navigation.goBack()`). Omit to hide the back button. */
  onExit?: () => void;
  /** Close the whole UI (the header's × button). */
  onClose: () => void;
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

/** A leading thumbnail for a row/section, or nothing when the node has no `icon`. */
function iconSlot(icon: string | undefined): JSX.Element[] {
  return icon !== undefined ? [<Image texture={icon} width={ICON_SIZE} height={ICON_SIZE} />] : [];
}

/**
 * Guide home — a visual index. Categories render as `minecraftTen` section headers with a
 * divider rule; pages render as icon menu rows (thumbnail + title + one-line subtitle + chevron).
 * `icon`/`descK` are optional per node, so an unannotated guide degrades to a clean text list.
 */
export function GuideHomeView({ manifest, title, onOpenPage, onExit, onClose }: GuideHomeViewProps): JSX.Element {
  const [collapsed, setCollapsed] = useState<string[]>(() => initialCollapsed(manifest.tree));

  const toggle = (id: string): void => {
    setCollapsed(collapsed.includes(id) ? collapsed.filter(c => c !== id) : [...collapsed, id]);
  };

  const rows: JSX.Element[] = [];

  const pageRow = (node: Extract<GuideTreeNode, { t: 'page' }>, depth: number): JSX.Element => (
    <MenuRow
      icon={node.icon}
      title={node.titleK}
      subtitle={node.descK}
      depth={depth}
      onPress={(): void => onOpenPage(node.id)}
    />
  );

  const sectionHeader = (node: Extract<GuideTreeNode, { t: 'cat' }>, depth: number, isCollapsed: boolean): JSX.Element => {
    const headerChildren: JSX.Element[] = [
      ...iconSlot(node.icon),
      <Text font={'minecraftTen'} shadow={true} maxLines={1} overflow={'ellipsis'} flexGrow={1} flexShrink={1}>{node.labelK}</Text>,
      <Text>{isCollapsed ? '§7+' : '§7-'}</Text>,
    ];

    return (
      <Button
        background={transparentTextures.default}
        backgroundHover={transparentTextures.hover}
        backgroundPressed={transparentTextures.pressed}
        paddingTop={spacing.sm}
        paddingBottom={spacing.xs}
        paddingLeft={spacing.sm}
        paddingRight={spacing.sm}
        marginTop={rows.length > 0 ? spacing.sm : 0}
        width={'100%'}
        justifyContent={'flex-start'}
        onPress={(): void => toggle(node.id)}
      >
        <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm} width={'100%'} paddingLeft={depth * spacing.md}>
          {headerChildren}
        </Panel>
      </Button>
    );
  };

  const walk = (nodes: GuideTreeNode[], depth: number): void => {
    for (const node of nodes) {
      if (node.t === 'page') {
        rows.push(pageRow(node, depth));
        continue;
      }

      const isCollapsed = collapsed.includes(node.id);

      rows.push(sectionHeader(node, depth, isCollapsed));
      rows.push(<Divider variant={'dark'} marginLeft={spacing.sm} marginRight={spacing.sm} marginBottom={spacing.xs} />);

      if (!isCollapsed) { walk(node.children, depth + 1); }
    }
  };

  walk(manifest.tree, 0);

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header title={title} onBack={onExit} onClose={onClose} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.xs}>
            {rows}
          </Panel>
        </Scroll>
      </Panel>
    </Card>
  );
}
