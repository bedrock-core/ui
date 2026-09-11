/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, Button as OreButton, theme, type TrailSegment } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import { Button, Image, List, Panel, Screen, Scroll, Text, useExit, type FunctionComponent, type JSX, type PressEvent } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import { FRAME, HEADER_HEIGHT, PADDING, TRAIL_LENGTHS } from './frame';

/**
 * A screen of rows that lead somewhere, as ONE compiled screen: the entity
 * roster of a scope and a level of the config tree are both this, and so is
 * any list a host fills at runtime. Each row carries its title and subtitle
 * live — a key the client resolves, or a literal — and shows the button its
 * row names, reset or remove, behind a carried visibility. Rows beyond a page are reached by paging,
 * since a compiled list has a fixed number of rows.
 */

const { spacing } = theme.tokens;
const row = theme.components.menuRow;
const header = theme.components.header;

const ICON_RESET = 'textures/ui/config/reset';

/** Rows a page holds. */
export const MENU_ROWS = 12;

/** Characters the live strings reserve. */
const ROW_TITLE_MAX = 24;
const ROW_SUBTITLE_MAX = 40;
const EMPTY_MAX = 48;
const PAGE_MAX = 8;

const ROW_HEIGHT = 26;
const ROW_GAP = spacing.xs;
const BODY_PADDING = spacing.sm;
const PAGER_HEIGHT = 16;
const PAGER_BUTTON = 24;

const { t } = i18n;

export interface MenuListRow {
  /** A key the client resolves, or a literal. */
  title: DisplayText;
  subtitle?: DisplayText;
  /**
   * The button beside the row, and which of the two it is.
   *
   * Both icons are baked and a carried visibility picks one: a texture cannot
   * travel on a compiled screen without a carrier of its own, and one bit per
   * row is cheaper than one string. Absent draws no button, and the row keeps
   * the square anyway so every row is the same width.
   */
  action?: 'reset' | 'remove';
}

export interface MenuListModel {
  /** The trail the screen is titled with, one segment per {@link TRAIL_LENGTHS} slot. */
  trail: readonly DisplayText[];
  /** This page's rows. */
  rows: readonly MenuListRow[];
  /** What the screen says when there are no rows at all. */
  empty: DisplayText;
  /** One-based, for the pager; a single page hides it. */
  page: number;
  pages: number;
  onRow?: (index: number, event: PressEvent) => unknown;
  onReset?: (index: number, event: PressEvent) => unknown;
  onPage?: (page: number, event: PressEvent) => unknown;
  onBack?: (event: PressEvent) => unknown;
}

export interface MenuListProps {
  model?: MenuListModel;
}

const EMPTY_MODEL: MenuListModel = { trail: [], rows: [], empty: '', page: 1, pages: 1 };

/** Every trail slot, live: a slot the present leaves empty hides with its separator. */
const trailSegments = (trail: readonly DisplayText[]): TrailSegment[] =>
  TRAIL_LENGTHS.map((maxLength, index) => ({ text: trail[index] ?? '', maxLength }));

export const MenuList: FunctionComponent<MenuListProps> = ({ model = EMPTY_MODEL }: MenuListProps): JSX.Element => {
  const exit = useExit();
  const { rows, page, pages } = model;
  const isEmpty = rows.length === 0;
  const paged = pages > 1;
  const bodyHeight = FRAME.height - HEADER_HEIGHT - 2 * PADDING;
  const listHeight = bodyHeight - 2 * BODY_PADDING - PAGER_HEIGHT - spacing.xs;
  const rowWidth = FRAME.width - 2 * PADDING - 2 * BODY_PADDING - 5;
  // The reset button takes a square off the row's right, whether or not the row shows one.
  const faceWidth = rowWidth - ROW_HEIGHT - spacing.xs;

  return (
    <Screen>
      <Card variant={'raised'} width={FRAME.width} height={FRAME.height} flexDirection={'column'} padding={0} gap={0}>
        <Header segments={trailSegments(model.trail)} onBack={(event): unknown => model.onBack?.(event)} onClose={exit} height={HEADER_HEIGHT} />
        <Panel flexDirection={'column'} gap={spacing.xs} padding={BODY_PADDING} height={bodyHeight}>
          <Scroll width={rowWidth + 5} height={listHeight}>
            <List
              max={MENU_ROWS}
              items={rows}
              gap={ROW_GAP}
              row={(item: MenuListRow | undefined, index: number): JSX.Element => {
                const action = item?.action;

                // A row's text is live, and a button's children bake into its
                // face, so the face is a button beneath and the text a panel above it.
                return (
                  <Panel width={rowWidth} height={ROW_HEIGHT}>
                    <Button
                      position={'absolute'}
                      left={0}
                      top={0}
                      width={faceWidth}
                      height={ROW_HEIGHT}
                      background={row.textures.background}
                      backgroundHover={row.textures.backgroundHover}
                      backgroundPressed={row.textures.backgroundPressed}
                      onPress={(event): unknown => model.onRow?.(index, event)}
                    />
                    <Panel position={'absolute'} left={0} top={0} width={faceWidth} height={ROW_HEIGHT} zIndex={2} flexDirection={'row'} alignItems={'center'} gap={row.gap} padding={row.padding}>
                      <Panel flexDirection={'column'} flexGrow={1} flexShrink={1} justifyContent={'center'}>
                        <Text font={row.textStyle.font} scale={row.textStyle.scale} shadow={true} maxLength={ROW_TITLE_MAX}>{item?.title ?? ''}</Text>
                        <Text font={row.textStyle.font} scale={row.textStyle.scale} color={row.textStyle.mutedRgb} maxLength={ROW_SUBTITLE_MAX}>{item?.subtitle ?? ''}</Text>
                      </Panel>
                      <Text>{`${row.textStyle.muted}>`}</Text>
                    </Panel>
                    {action === 'reset' && (
                      <OreButton position={'absolute'} left={faceWidth + spacing.xs} top={0} variant={'secondary'} width={ROW_HEIGHT} height={ROW_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} onPress={(event): unknown => model.onReset?.(index, event)}>
                        <Image width={10} height={10} texture={ICON_RESET} />
                      </OreButton>
                    )}
                    {action === 'remove' && (
                      // The header's own close face, which carries its cross in the
                      // texture — the pack ships no separate remove glyph, and a
                      // reset arrow beside a list item would read as "revert it".
                      <Button
                        position={'absolute'}
                        left={faceWidth + spacing.xs}
                        top={0}
                        width={ROW_HEIGHT}
                        height={ROW_HEIGHT}
                        background={header.textures.close}
                        backgroundHover={header.textures.closeHover}
                        backgroundPressed={header.textures.closePressed}
                        onPress={(event): unknown => model.onReset?.(index, event)}
                      />
                    )}
                  </Panel>
                );
              }}
            />
          </Scroll>
          {/* Over the scroll rather than in it: a scroll whose only child is the list follows the live row count. */}
          {isEmpty && (
            <Panel position={'absolute'} left={BODY_PADDING} top={BODY_PADDING} width={rowWidth} height={listHeight} justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
              <Text wordBreak={'break-word'} color={row.textStyle.mutedRgb} maxLength={EMPTY_MAX}>{model.empty}</Text>
            </Panel>
          )}
          {paged && (
            <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'center'} gap={spacing.sm} height={PAGER_HEIGHT}>
              <OreButton variant={'secondary'} width={PAGER_BUTTON} height={PAGER_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} enabled={page > 1} onPress={(event): unknown => model.onPage?.(page - 1, event)}>
                <Text>{`§0${t($ => $.paging.previous)}`}</Text>
              </OreButton>
              <Text maxLength={PAGE_MAX}>{t($ => $.paging.of, { page: String(page), pages: String(pages) })}</Text>
              <OreButton variant={'secondary'} width={PAGER_BUTTON} height={PAGER_HEIGHT} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} enabled={page < pages} onPress={(event): unknown => model.onPage?.(page + 1, event)}>
                <Text>{`§0${t($ => $.paging.next)}`}</Text>
              </OreButton>
            </Panel>
          )}
        </Panel>
      </Card>
    </Screen>
  );
};

/** The list filled with one present's model, for `render()`. */
export const menuListElement = (model: MenuListModel): JSX.Element => <MenuList model={model} />;

/** The rows of page `page` (one-based) of `all`, and how many pages there are. */
export function pageOf<T>(all: readonly T[], page: number): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(all.length / MENU_ROWS));
  const current = Math.min(Math.max(1, page), pages);

  return { rows: all.slice((current - 1) * MENU_ROWS, current * MENU_ROWS), page: current, pages };
}
