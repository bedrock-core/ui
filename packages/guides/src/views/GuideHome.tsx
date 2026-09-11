/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Header, MenuRow, theme } from '@bedrock-core/ore-styled';
import { Button, Disclosure, Image, Panel, Scroll, Text, useState, type JSX } from '@bedrock-core/ui-runtime';
import type { GuideTreeNode, PageId } from '../types';

const { spacing } = theme.tokens;
const transparentTextures = theme.components.button.variants.transparent.textures;

/** Row/section thumbnail edge (px) for authored `icon` textures. */
const ICON_SIZE = 16;

/** The header box of a client-folded section: a row of text with its padding. */
const SECTION_HEADER_HEIGHT = 20;

/**
 * How a section folds.
 *
 * - `'state'`: pressing the header re-renders with the section collapsed — a
 *   serialized screen's way, where every render is a present anyway.
 * - `'client'`: the header is a client-side toggle and the rows fold with no
 *   press reaching script — what a compiled screen needs, where a re-render
 *   cannot change the shape.
 * - `'none'`: every row renders expanded and the headers are plain.
 */
export type GuideFolding = 'state' | 'client' | 'none';

export interface GuideHomeViewProps {
  /**
   * The sidebar as the viewing audience sees it — `visibleTree(manifest, audience)`. The home
   * screen IS the tree, so it takes the filtered one rather than a manifest plus an audience
   * to filter it by all over again.
   */
  tree: GuideTreeNode[];
  /** Header title (raw text, colorable). */
  title: string;
  /** The index's box. Unset, it takes the space its host gives it. */
  width?: number;
  height?: number;
  /**
   * The screen key a page row opens. Every page is a compiled screen of its own,
   * so a row is a link and where it leads is data the build can read.
   */
  linkTo: (pageId: PageId) => string;
  /**
   * Show a back control that returns wherever the player came from — the addon
   * list, a menu, whatever opened the guide. Omit on the index an addon opens
   * itself, which has nothing behind it.
   */
  back?: boolean;
  /** Close the whole UI (the header's × button). */
  onClose: () => void;
  /** How sections fold; see {@link GuideFolding}. Defaults to `'state'`. */
  folding?: GuideFolding;
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

type Category = Extract<GuideTreeNode, { t: 'cat' }>;
type Page = Extract<GuideTreeNode, { t: 'page' }>;

/**
 * Guide home — a visual index. Categories render as `minecraftTen` section headers with a
 * divider rule; pages render as icon menu rows (thumbnail + title + one-line subtitle + chevron).
 * `icon`/`descK` are optional per node, so an unannotated guide degrades to a clean text list.
 */
export function GuideHomeView({ tree, title, width, height, linkTo, back, onClose, folding = 'state' }: GuideHomeViewProps): JSX.Element {
  const [collapsed, setCollapsed] = useState<string[]>(() => folding === 'state' ? initialCollapsed(tree) : []);

  const toggle = (id: string): void => {
    setCollapsed(collapsed.includes(id) ? collapsed.filter(c => c !== id) : [...collapsed, id]);
  };

  const pageRow = (node: Page, depth: number): JSX.Element => (
    <MenuRow
      icon={node.icon}
      title={node.titleK}
      subtitle={node.descK}
      depth={depth}
      to={linkTo(node.id)}
    />
  );

  /** The header's content: thumbnail, label, and the fold glyph when there is a fold. */
  const headerContent = (node: Category, isCollapsed: boolean, glyph: boolean): JSX.Element[] => [
    ...iconSlot(node.icon),
    <Text font={'minecraftTen'} shadow={true} maxLines={1} overflow={'ellipsis'} flexGrow={1} flexShrink={1}>{node.labelK}</Text>,
    ...glyph ? [<Text>{isCollapsed ? '§7+' : '§7-'}</Text>] : [],
  ];

  /** A header that is not a control of its own: for `'none'`, and for the faces of a client fold. */
  const plainHeader = (node: Category, depth: number, isCollapsed: boolean, glyph: boolean, marginTop: number): JSX.Element => (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      gap={spacing.sm}
      width={'100%'}
      paddingTop={spacing.sm}
      paddingBottom={spacing.xs}
      paddingLeft={spacing.sm + depth * spacing.md}
      paddingRight={spacing.sm}
      marginTop={marginTop}
    >
      {headerContent(node, isCollapsed, glyph)}
    </Panel>
  );

  const rule = (): JSX.Element => <Divider variant={'dark'} marginLeft={spacing.sm} marginRight={spacing.sm} marginBottom={spacing.xs} />;

  // ── 'client': each category is a Disclosure; the fold never reaches script ──
  const clientRows = (nodes: GuideTreeNode[], depth: number): JSX.Element[] =>
    nodes.flatMap((node, index): JSX.Element[] => {
      if (node.t === 'page') {
        return [pageRow(node, depth)];
      }

      return [
        <Disclosure
          header={plainHeader(node, depth, false, true, 0)}
          headerClosed={plainHeader(node, depth, true, true, 0)}
          headerHeight={SECTION_HEADER_HEIGHT}
          defaultOpen={node.collapsed !== true}
          gap={spacing.xs}
          marginTop={index > 0 ? spacing.sm : 0}
        >
          {[rule(), ...clientRows(node.children, depth + 1)]}
        </Disclosure>,
      ];
    });

  if (folding === 'client') {
    return (
      <Card flexDirection={'column'} padding={0} gap={0} width={width} height={height}>
        <Header title={title} back={back} onClose={onClose} />
        <Panel flexGrow={1} padding={spacing.sm}>
          <Scroll>
            <Panel flexDirection={'column'} gap={spacing.xs}>
              {clientRows(tree, 0)}
            </Panel>
          </Scroll>
        </Panel>
      </Card>
    );
  }

  // ── 'state' and 'none': one flat list of rows ──
  const rows: JSX.Element[] = [];

  const sectionHeader = (node: Category, depth: number, isCollapsed: boolean): JSX.Element => {
    if (folding === 'none') {
      return plainHeader(node, depth, isCollapsed, false, rows.length > 0 ? spacing.sm : 0);
    }

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
          {headerContent(node, isCollapsed, true)}
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
      rows.push(rule());

      if (!isCollapsed) { walk(node.children, depth + 1); }
    }
  };

  walk(tree, 0);

  return (
    <Card flexDirection={'column'} padding={0} gap={0} width={width} height={height}>
      <Header title={title} back={back} onClose={onClose} />
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
