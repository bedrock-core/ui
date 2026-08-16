/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Header, MenuRow, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { Image, Panel, Scroll, Text, useExit, useState, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import { isOperator } from '../permissions';
import { openConfig } from '../navigation/openConfig';
import { FRAMEWORK_ADDON_ID } from '../frameworkGuide';
import type { AppScreen } from '../navigation/routes';

const { spacing } = theme.tokens;

const ICON_MISSING = 'pack_icon';
const ICON_CONFIG = 'textures/ui/config/config';
const ICON_GUIDE = 'textures/ui/config/guide';

/** Addon thumbnail edge (px) in the picker column — larger than the theme's default row icon. */
const ROW_ICON_SIZE = 20;

// Thumbnail banner proportions (width / height) — the layout engine derives the
// height from the panel's resolved width via `aspectRatio`.
const THUMBNAIL_RATIO = 16 / 6;

/** The registry fields the list renders — `RegisteredAddon` satisfies it structurally. */
interface DisplayAddon {
  id: string;
  packName: string;
  version: string;
  creator: string;
  creatorName?: string;
  description?: string;
  icon?: string;
  thumbnail?: string;
}

/**
 * Synthetic row for the framework itself, pinned at the bottom of the list. It is not in the
 * registry (nothing registers it); name/description are plain text — Text measures unmatched
 * keys literally, and the description must stay under the 80-byte serialization cap since the
 * literal travels as the localization key.
 *
 * The version is read back off this realm's own registry entry rather than imported from
 * `@bedrock-core/server-runtime`: the registry already stamps `runtimeVersion` on the self
 * entry with exactly that constant, and taking it from there is what keeps this package's
 * dependency on the runtime type-only.
 */
function frameworkAddon(runtimeVersion: string): DisplayAddon {
  return {
    id: FRAMEWORK_ADDON_ID,
    packName: '@bedrock-core',
    version: runtimeVersion,
    creator: 'drav0011',
    creatorName: 'DrAv0011',
    description: 'The framework that powers every addon above.',
    icon: 'textures/ui/bedrock_core/icon',
  };
}

export function List({ navigation, route }: AppScreen<'List'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const { t } = useTranslation();
  const registered = core.registry.all();
  const addons: DisplayAddon[] = [
    ...registered,
    frameworkAddon(registered.find(addon => addon.self)?.runtimeVersion ?? 'unknown'),
  ];
  const initialSel = route.params?.selectedId && addons.some(a => a.id === route.params!.selectedId)
    ? route.params.selectedId
    : addons[0]?.id;
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSel);
  const selected = addons.find(a => a.id === selectedId);

  const exit = useExit();

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header title={t($ => $.addons.title)} onClose={exit} />
      <Panel flexDirection={'row'} flexGrow={1}>
        <Panel width={'40%'} padding={spacing.sm}>
          <Scroll>
            <Panel flexDirection={'column'} gap={spacing.xs}>
              {addons.map(addon => (
                <MenuRow
                  icon={addon.icon ?? ICON_MISSING}
                  iconSize={ROW_ICON_SIZE}
                  title={{ key: addon.packName }}
                  subtitle={{ text: addon.version }}
                  chevron={false}
                  onPress={(): void => setSelectedId(addon.id)}
                />
              ))}
            </Panel>
          </Scroll>
        </Panel>
        <Divider orientation={'vertical'} marginBottom={1} />
        <Panel flexGrow={1}>
          {selected ? <AddonDetails core={core} addon={selected} player={player} navigation={navigation} /> : null}
        </Panel>
      </Panel>
    </Card>
  );
}

function AddonDetails({ core, addon, player, navigation }: {
  core: Runtime;
  addon: DisplayAddon;
  player: Player;
  navigation: AppScreen<'List'>['navigation'];
}): JSX.Element {
  const { t } = useTranslation();
  const accessor = core.config.of(addon.id, { actorId: player.id });
  const hasConfig = accessor !== undefined;
  // The framework's own guide is built in rather than replicated — see `frameworkGuide.ts`.
  const hasGuide = addon.id === FRAMEWORK_ADDON_ID || core.guides.has(addon.id);

  function openGuide(): void {
    navigation.navigate('Guide', { addonId: addon.id });
  }

  /**
   * An operator picks a scope; anyone else has exactly one they may open, so the picker would
   * be a screen with a single enabled row. Same rule `clampTarget` applies to a command, applied
   * to the press — a player should not reach a different place depending on how they got here.
   */
  const openConfigFor = async (): Promise<void> => {
    if (!accessor) { return; }

    if (isOperator(player)) {
      navigation.navigate('ConfigScope', { addonId: addon.id });

      return;
    }

    await openConfig(navigation, accessor, {
      addonId: addon.id,
      scope: 'player',
      entityId: player.id,
      breadcrumb: `${addon.packName} > ${player.name}`,
    });
  };

  return (
    <Panel flexGrow={1}>
      {addon.thumbnail
        ? <Panel position={'absolute'} left={0} right={1} top={0} aspectRatio={THUMBNAIL_RATIO} background={addon.thumbnail} />
        : null}
      <Panel flexDirection={'column'} flexGrow={1} gap={spacing.md} padding={spacing.md}>
        <Panel justifyContent={'center'} alignItems={'center'}>
          <Image width={40} height={40} texture={addon.icon ?? ICON_MISSING} />
        </Panel>
        <Panel flexDirection={'column'}>
          <Text font={'mojangles'} scale={2} shadow={true} localizationKey={addon.packName} />
          <Text font={'mojangles'} scale={1}>{`§7${t($ => $.addons.version, { version: addon.version })}`}</Text>
        </Panel>
        <Panel flexDirection={'row'} gap={spacing.sm}>
          <OreButton
            variant={'secondary'}
            paddingTop={2}
            paddingLeft={4}
            enabled={hasConfig}
            onPress={openConfigFor}
          >
            <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
              <Image width={12} height={12} texture={ICON_CONFIG} />
              <Text font={'mojangles'} scale={1}>{`${hasConfig ? '§0' : '§8'}${t($ => $.addons.config)}`}</Text>
            </Panel>
          </OreButton>
          <OreButton variant={'secondary'} paddingTop={2} paddingLeft={4} enabled={hasGuide} onPress={openGuide}>
            <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
              <Image width={12} height={12} texture={ICON_GUIDE} />
              <Text font={'mojangles'} scale={1}>{`${hasGuide ? '§0' : '§8'}${t($ => $.addons.guide)}`}</Text>
            </Panel>
          </OreButton>
        </Panel>
        <Card variant={'dark'}>
          {/* Registry fields are translation keys — color/style codes live in the
              owning addon's .lang values (a key can't carry a § prefix). */}
          <Text font={'mojangles'} scale={1} maxLines={4} wordBreak={'break-word'} localizationKey={addon.description ?? ''} />
        </Card>
        {/* The label's own trailing space is dropped by the label control, so the gap is a real
            one; the value takes the remaining width and wraps rather than running off the card —
            a creator line is a free-form list ("DrAv0011, Bedrock Tweaks") with no length bound. */}
        <Panel flexDirection={'row'} alignItems={'flex-start'} gap={spacing.xs}>
          <Text shadow={true} flexShrink={0}>{`§7${t($ => $.addons.authors)}`}</Text>
          <Panel flexGrow={1} flexShrink={1}>
            <Text font={'mojangles'} scale={1} maxLines={2} wordBreak={'break-word'} localizationKey={addon.creatorName ?? addon.creator} />
          </Panel>
        </Panel>
      </Panel>
    </Panel>
  );
}
