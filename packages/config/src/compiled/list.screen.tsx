/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Header, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import {
  Button, EmbedSlots, Image, List, Panel, Scroll, Text, useExit,
  type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import { ADDONS_MAX, FRAME, HEADER_HEIGHT, MAIN, PADDING, PAGE_SLOTS, SIDEBAR_WIDTH } from './frame';

/**
 * The addon list as ONE compiled screen, the host's.
 *
 * Three regions. The header and the sidebar are the host's to draw: which
 * addons are installed is only known at runtime, so the sidebar is `<List
 * max>` rows carrying each addon's icon, name and version live. The main
 * area is NOT the host's: what it shows for one addon is that addon's own
 * page, baked in that addon's pack against {@link MAIN} and drawn into this
 * frame while the first entry carries the addon's marker (`<EmbedSlots>`).
 * An addon that published no page gets the generic panel; the framework's
 * own row, which no pack draws, gets its panel here.
 */

const { spacing } = theme.tokens;
const row = theme.components.menuRow;

const ICON_MISSING = 'pack_icon';
const ICON_GUIDE = 'textures/ui/config/guide';
const ICON_FRAMEWORK = 'textures/ui/bedrock_core/icon';

/** Characters a row's live name and version reserve. */
const NAME_MAX = 16;
const VERSION_MAX = 12;

const SIDEBAR_PADDING = spacing.sm;
const ROW_ICON = 20;
const ROW_HEIGHT = ROW_ICON + 2 * spacing.xs;
const ROW_GAP = spacing.xs;

// A compiled screen serves every player, so its baked strings are the
// package's own default locale; a key is what the client localizes.
const { key, t } = i18n;

export interface AddonListRow {
  id: string;
  /** Display strings, resolved for the viewing player. */
  name: string;
  version: string;
  icon?: string;
}

/** What the main area shows for the selected row. */
export type AddonListMain
  = | { kind: 'page'; slots: readonly string[] }
    | { kind: 'fallback' }
    | { kind: 'framework'; hasGuide: boolean; onGuide?: (event: PressEvent) => unknown };

export interface AddonListModel {
  rows: readonly AddonListRow[];
  selected: number;
  main: AddonListMain;
  onSelect?: (index: number, event: PressEvent) => unknown;
  /** A press on one of the page's entries, by slot (1-based; 0 is the marker). */
  onSlot?: (slot: number, event: PressEvent) => unknown;
}

export interface AddonListProps {
  model?: AddonListModel;
}

const EMPTY_MODEL: AddonListModel = { rows: [], selected: 0, main: { kind: 'fallback' } };

export const AddonList: FunctionComponent<AddonListProps> = ({ model = EMPTY_MODEL }: AddonListProps): JSX.Element => {
  const exit = useExit();
  const { rows, selected, main } = model;
  const current = rows[selected];
  const slots = main.kind === 'page' ? main.slots : [];
  const showsFallback = main.kind === 'fallback';
  const showsFramework = main.kind === 'framework';
  const frameworkGuide = main.kind === 'framework' && main.hasGuide;
  const rowWidth = SIDEBAR_WIDTH - PADDING - 2 * SIDEBAR_PADDING - 5;

  return (
    <Card variant={'raised'} width={FRAME.width} height={FRAME.height} padding={0} gap={0}>
      <EmbedSlots count={PAGE_SLOTS} values={slots} onPress={model.onSlot} position={'absolute'} left={0} top={0} width={0} height={0} />
      <Header title={key($ => $.addons.title)} onClose={exit} position={'absolute'} left={PADDING} right={PADDING} top={PADDING} height={HEADER_HEIGHT} marginTop={0} marginLeft={0} marginRight={0} />
      <Panel position={'absolute'} left={PADDING} top={MAIN.y} width={SIDEBAR_WIDTH - PADDING} height={MAIN.height} padding={SIDEBAR_PADDING}>
        <Scroll width={SIDEBAR_WIDTH - PADDING - 2 * SIDEBAR_PADDING} height={MAIN.height - 2 * SIDEBAR_PADDING}>
          <List
            max={ADDONS_MAX}
            items={rows}
            gap={ROW_GAP}
            row={(item: AddonListRow | undefined, index: number): JSX.Element => {
              const isSelected = item !== undefined && index === selected;

              return (
                <Panel width={rowWidth} height={ROW_HEIGHT}>
                  <Button
                    position={'absolute'}
                    left={0}
                    top={0}
                    width={rowWidth}
                    height={ROW_HEIGHT}
                    background={row.textures.background}
                    backgroundHover={row.textures.backgroundHover}
                    backgroundPressed={row.textures.backgroundPressed}
                    onPress={(event: PressEvent): unknown => model.onSelect?.(index, event)}
                  />
                  {isSelected && <Image position={'absolute'} left={0} top={0} width={rowWidth} height={ROW_HEIGHT} zIndex={1} texture={row.textures.backgroundSelected} />}
                  <Panel position={'absolute'} left={0} top={0} width={rowWidth} height={ROW_HEIGHT} zIndex={2} flexDirection={'row'} alignItems={'center'} gap={row.gap} padding={spacing.xs}>
                    <Image live={true} width={ROW_ICON} height={ROW_ICON} texture={item?.icon ?? ICON_MISSING} />
                    <Panel flexDirection={'column'} flexGrow={1} flexShrink={1} justifyContent={'center'}>
                      <Text font={row.textStyle.font} scale={row.textStyle.scale} shadow={true} maxLength={NAME_MAX}>{`${row.textStyle.color}${item?.name ?? ''}`}</Text>
                      <Text font={row.textStyle.font} scale={row.textStyle.scale} maxLength={VERSION_MAX}>{`${row.textStyle.muted}${item?.version ?? ''}`}</Text>
                    </Panel>
                  </Panel>
                </Panel>
              );
            }}
          />
        </Scroll>
      </Panel>
      <Divider orientation={'vertical'} position={'absolute'} left={SIDEBAR_WIDTH} top={MAIN.y} height={MAIN.height} />
      {showsFallback && (
        <Panel position={'absolute'} left={MAIN.x} top={MAIN.y} width={MAIN.width} height={MAIN.height} flexDirection={'column'} gap={spacing.md} padding={spacing.md}>
          <Text font={'mojangles'} scale={2} shadow={true} maxLength={NAME_MAX}>{current?.name ?? ''}</Text>
          <Text font={'mojangles'} scale={1} maxLength={VERSION_MAX}>{`§7${current?.version ?? ''}`}</Text>
        </Panel>
      )}
      {showsFramework && (
        <Panel position={'absolute'} left={MAIN.x} top={MAIN.y} width={MAIN.width} height={MAIN.height} flexDirection={'column'} gap={spacing.md} padding={spacing.md}>
          <Panel justifyContent={'center'} alignItems={'center'}>
            <Image width={40} height={40} texture={ICON_FRAMEWORK} />
          </Panel>
          <Panel flexDirection={'column'}>
            <Text font={'mojangles'} scale={2} shadow={true}>{key($ => $.framework.name)}</Text>
            <Text font={'mojangles'} scale={1} maxLength={VERSION_MAX}>{`§7${current?.version ?? ''}`}</Text>
          </Panel>
          <Panel flexDirection={'row'} gap={spacing.sm}>
            <OreButton variant={'secondary'} paddingTop={2} paddingLeft={4} enabled={frameworkGuide} onPress={main.kind === 'framework' ? main.onGuide : undefined}>
              <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
                <Image width={12} height={12} texture={ICON_GUIDE} />
                <Text font={'mojangles'} scale={1}>{`§0${t($ => $.addons.guide)}`}</Text>
              </Panel>
            </OreButton>
          </Panel>
          <Card variant={'dark'}>
            <Text font={'mojangles'} scale={1} maxLines={4} wordBreak={'break-word'}>{key($ => $.framework.description)}</Text>
          </Card>
          <Panel flexDirection={'row'} alignItems={'flex-start'} gap={spacing.xs}>
            <Text shadow={true} flexShrink={0}>{`§7${t($ => $.addons.authors)}`}</Text>
            <Text font={'mojangles'} scale={1}>{key($ => $.framework.creator)}</Text>
          </Panel>
        </Panel>
      )}
    </Card>
  );
};

/** The list filled with one present's model, for `render()`. */
export const addonListElement = (model: AddonListModel): JSX.Element => <AddonList model={model} />;
