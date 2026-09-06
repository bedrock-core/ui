/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import {
  compiledSnapshotOf, compiledValuesOf, Embed, Image, Panel, Scroll, Text,
  type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { buildScreenTree } from '@bedrock-core/ui-runtime/compile';
import { i18n } from '../i18n';
import { FRAME, MAIN } from './frame';

/**
 * One addon's page in the addon list, baked in the ADDON's pack.
 *
 * Everything on it is the addon's own — thumbnail, icon, name, description,
 * authors — and none of it changes at runtime, so none of it is carried: the
 * strings are localization keys the client resolves from the addon's own
 * `.lang`, the textures are the addon's, and the layout is baked against
 * the list's {@link MAIN} area. The host draws the frame around it, writes
 * the addon's marker into the first entry, and reads the two presses back.
 *
 * The addon declares the page like any screen — a module default-exporting
 * `() => <AddonPage addon={...} />` — and publishes what presenting it needs
 * through `core.register({ page: addonPageReference(Page) })`.
 */

const { spacing } = theme.tokens;

// Baked in the package's default locale: the page serves every player. Keys localize on the client.
const { t } = i18n;

const ICON_MISSING = 'pack_icon';
const ICON_CONFIG = 'textures/ui/config/config';
const ICON_GUIDE = 'textures/ui/config/guide';

/** Thumbnail banner proportions (width / height). */
const THUMBNAIL_RATIO = 16 / 6;

/** What the page bakes about its addon: the manifest's display fields. */
export interface AddonPageInfo {
  /** Display name — a localization key, or plain text. */
  packName: string;
  version: string;
  creator: string;
  creatorName?: string;
  description?: string;
  icon?: string;
  thumbnail?: string;
}

export interface AddonPageProps {
  addon: AddonPageInfo;
}

/** Where a press on the page leads; the host answers it. */
export type PageTarget = 'config' | 'guide';

/** A press handler that names its target, so the reference can read it off the built tree. */
interface TargetedPress {
  (event: PressEvent): void;
  pageTarget: PageTarget;
}

const targeted = (pageTarget: PageTarget): TargetedPress => Object.assign((_event: PressEvent): void => {}, { pageTarget });

const pressConfig = targeted('config');
const pressGuide = targeted('guide');

const targetOf = (handler: unknown): PageTarget | null => {
  if (typeof handler !== 'function' || !('pageTarget' in handler)) {
    return null;
  }

  const { pageTarget } = handler;

  return pageTarget === 'config' || pageTarget === 'guide' ? pageTarget : null;
};

export const AddonPage: FunctionComponent<AddonPageProps> = ({ addon }: AddonPageProps): JSX.Element => (
  <Embed width={FRAME.width} height={FRAME.height}>
    <Panel position={'absolute'} left={MAIN.x} top={MAIN.y} width={MAIN.width} height={MAIN.height}>
      {/* Two pixels short of the area, so the track clears the card's edge. */}
      <Scroll width={MAIN.width - 2} height={MAIN.height}>
        <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.md} width={MAIN.width - 2 - 5}>
          {/* Absolute, so a page without a banner loses no room: an empty background draws nothing. */}
          <Panel position={'absolute'} left={0} right={0} top={0} aspectRatio={THUMBNAIL_RATIO} background={addon.thumbnail ?? ''} />
          <Panel justifyContent={'center'} alignItems={'center'}>
            <Image width={40} height={40} texture={addon.icon ?? ICON_MISSING} />
          </Panel>
          <Panel flexDirection={'column'}>
            <Text font={'mojangles'} scale={2} shadow={true}>{addon.packName}</Text>
            <Text font={'mojangles'} scale={1}>{`§7${t($ => $.addons.version, { version: addon.version })}`}</Text>
          </Panel>
          <Panel flexDirection={'row'} gap={spacing.sm}>
            <OreButton variant={'secondary'} paddingTop={2} paddingLeft={4} onPress={pressConfig}>
              <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
                <Image width={12} height={12} texture={ICON_CONFIG} />
                <Text font={'mojangles'} scale={1}>{`§0${t($ => $.addons.config)}`}</Text>
              </Panel>
            </OreButton>
            <OreButton variant={'secondary'} paddingTop={2} paddingLeft={4} onPress={pressGuide}>
              <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
                <Image width={12} height={12} texture={ICON_GUIDE} />
                <Text font={'mojangles'} scale={1}>{`§0${t($ => $.addons.guide)}`}</Text>
              </Panel>
            </OreButton>
          </Panel>
          <Card variant={'dark'}>
            <Text font={'mojangles'} scale={1} wordBreak={'break-word'}>{addon.description ?? ''}</Text>
          </Card>
          <Panel flexDirection={'row'} alignItems={'flex-start'} gap={spacing.xs}>
            <Text shadow={true} flexShrink={0}>{`§7${t($ => $.addons.authors)}`}</Text>
            <Panel flexGrow={1} flexShrink={1}>
              <Text font={'mojangles'} scale={1} wordBreak={'break-word'}>{addon.creatorName ?? addon.creator}</Text>
            </Panel>
          </Panel>
        </Panel>
      </Scroll>
    </Panel>
  </Embed>
);

/**
 * A page reduced to what a host needs to draw it: per entry after the
 * marker, the value it is shown with and where a press on it leads. What
 * replicates across addons — the host writes these into its reserved slots
 * and the client draws the page from the addon's pack.
 */
export interface AddonPageReference {
  v: 1;
  /** Slot `i + 1` is shown with `values[i]`. */
  values: string[];
  /** Where a press on slot `i + 1` leads; null where it leads nowhere. */
  targets: (PageTarget | null)[];
}

/**
 * The reference of a page screen: built once the way the compile built it,
 * its entries read off the tree and each press's target read off its handler.
 */
export function addonPageReference(Page: FunctionComponent): AddonPageReference {
  const { entries, values } = compiledValuesOf(buildScreenTree(Page), compiledSnapshotOf(Page));

  return {
    v: 1,
    values,
    targets: entries.map(entry => (entry.role === 'button' ? targetOf(entry.element.props.onPress) : null)),
  };
}

/** Narrows a reference that arrived over the wire. */
export function isAddonPageReference(value: unknown): value is AddonPageReference {
  if (typeof value !== 'object' || value === null) { return false; }

  const candidate = value as Partial<AddonPageReference>;

  return candidate.v === 1 && Array.isArray(candidate.values) && Array.isArray(candidate.targets);
}
