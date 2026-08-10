/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button as OreButton, Card, theme } from '@bedrock-core/ore-styled';
import { Button, Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { allowedScopes, isOperator } from '../permissions';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { patchScope } from '../config/values';
import { openConfig } from '../navigation/openConfig';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

const { spacing } = theme.tokens;

const HEADER_BG = 'textures/ui/ore-styled/header/background';
const ICON_BACK = 'textures/ui/ore-styled/button/back/background';
const ICON_BACK_HOVER = 'textures/ui/ore-styled/button/back/background_hover';
const ICON_BACK_PRESSED = 'textures/ui/ore-styled/button/back/background_pressed';
const ICON_CLOSE = 'textures/ui/ore-styled/button/close/background';
const ICON_CLOSE_HOVER = 'textures/ui/ore-styled/button/close/background_hover';
const ICON_CLOSE_PRESSED = 'textures/ui/ore-styled/button/close/background_pressed';
const ICON_RESET = 'textures/ui/config/reset';

/**
 * Scope picker for one addon: three rows — server, dimension, player. Server
 * jumps straight into the addon's server-wide settings. Dimension and player
 * jump into a select list of known dimensions / online players, each with its
 * own edit and reset-to-default entry. Every row's reset button resets that
 * row's scope to the addon's code-defined defaults.
 */
export function ConfigScope({ navigation, route }: AppScreen<'ConfigScope'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { addonId } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });

  if (!accessor) { return <Missing navigation={navigation} addonId={addonId} />; }

  const configAccessor = accessor;
  const addonName = core.registry.get(addonId)?.packName ?? addonId;
  const schema = getScopedSchema(configAccessor);

  const navigateToServer = async (): Promise<void> =>
    openConfig(navigation, configAccessor, { addonId, scope: 'server', breadcrumb: `${addonName} > Server` });

  const navigateToEntityList = (scope: 'dimension' | 'player', label: string): void => {
    navigation.navigate('EntityList', { addonId, scope, breadcrumb: `${addonName} > ${label}` });
  };

  /** A non-operator has exactly one player to pick, so the roster screen is skipped for them. */
  const navigateToOwnPlayer = async (): Promise<void> =>
    openConfig(navigation, configAccessor, { addonId, scope: 'player', entityId: player.id, breadcrumb: `${addonName} > ${player.name}` });

  const resetServerToSchemaDefaults = (): void => {
    patchScope(configAccessor, 'server', undefined, schemaDefaultsPatch(filterScope(schema, 'server')));
  };

  // Reachable at all (the addon declares the scope) AND permitted (this player may open it).
  // `clampTarget` already keeps a deep link from landing here, but a non-operator can still
  // walk List → addon and arrive, so the gate has to live on the rows too.
  const scopes = allowedScopes(player);
  const canPickAnyPlayer = isOperator(player);
  const hasServer = Object.keys(filterScope(schema, 'server')).length > 0 && scopes.includes('server');
  const hasDimension = Object.keys(filterScope(schema, 'dimension')).length > 0 && scopes.includes('dimension');
  const hasPlayer = Object.keys(filterScope(schema, 'player')).length > 0 && scopes.includes('player');

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'} padding={spacing.sm} marginTop={1} marginLeft={1} marginRight={1} background={HEADER_BG}>
        <Button width={15} height={15} background={ICON_BACK} backgroundHover={ICON_BACK_HOVER} backgroundPressed={ICON_BACK_PRESSED} onPress={(): void => navigation.goBack()} />
        <Panel position={'absolute'} left={spacing.sm} right={spacing.sm} top={spacing.sm} bottom={spacing.sm} justifyContent={'center'} alignItems={'center'}>
          <Text font={'minecraftTen'} scale={1} offsetY={-2} localizationKey={addonName} />
        </Panel>
        <Button width={15} height={15} background={ICON_CLOSE} backgroundHover={ICON_CLOSE_HOVER} backgroundPressed={ICON_CLOSE_PRESSED} onPress={exit} />
      </Panel>
      <Scroll>
        <Panel flexDirection={'column'} gap={spacing.sm} padding={spacing.sm}>
          <ScopeRow
            label={'Server'}
            enabled={hasServer}
            onPress={navigateToServer}
            onReset={resetServerToSchemaDefaults}
          />
          <ScopeRow
            label={'Dimension'}
            enabled={hasDimension}
            onPress={(): void => navigateToEntityList('dimension', 'Dimension')}
          />
          <ScopeRow
            label={'Player'}
            enabled={hasPlayer}
            onPress={canPickAnyPlayer
              ? (): void => navigateToEntityList('player', 'Player')
              : navigateToOwnPlayer}
          />
        </Panel>
      </Scroll>
    </Card>
  );
}

/** One grid row: a scope button with a transparent reset-icon button glued to its right. */
function ScopeRow({
  label,
  enabled,
  onPress,
  onReset,
}: {
  label: string;
  enabled: boolean;
  // Allow an async handler: the presenter awaits it, holding the press's transaction open
  // so navigation completes before the form re-presents.
  onPress: () => unknown | Promise<unknown>;
  onReset?: () => void;
}): JSX.Element {
  return (
    <Panel flexDirection={'row'} gap={spacing.xs}>
      <Panel flexGrow={1}>
        <OreButton variant={'primary'} enabled={enabled} onPress={onPress}>{label}</OreButton>
      </Panel>
      {onReset
        ? (
            <OreButton variant={'secondary'} paddingLeft={spacing.sm} paddingRight={spacing.sm} paddingTop={spacing.xs} paddingBottom={spacing.xs} enabled={enabled} onPress={onReset}>
              <Image width={10} height={10} texture={ICON_RESET} marginBottom={spacing.xs} />
            </OreButton>
          )
        : null}
    </Panel>
  );
}
