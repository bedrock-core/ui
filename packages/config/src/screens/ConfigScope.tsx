/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, MenuRow, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import { Image, Panel, Scroll, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { allowedScopes, isOperator } from '../permissions';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { patchScope } from '../config/values';
import { openConfig } from '../navigation/openConfig';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

const { spacing } = theme.tokens;

const ICON_RESET = 'textures/ui/config/reset';

/** Row subtitles. Raw `Text` is capped at 80 UTF-8 bytes, so these stay one short line. */
const SCOPE_HINT = {
  server: 'Shared by everyone on the realm.',
  dimension: 'Overrides for one dimension.',
  player: 'Overrides for one player.',
} as const;

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
      <Header
        title={{ key: addonName }}
        breadcrumbs={[{ text: 'Config' }]}
        onBack={(): void => navigation.goBack()}
        onClose={exit}
      />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.xs}>
            <ScopeRow
              label={'Server'}
              hint={SCOPE_HINT.server}
              enabled={hasServer}
              onPress={navigateToServer}
              onReset={resetServerToSchemaDefaults}
            />
            <ScopeRow
              label={'Dimension'}
              hint={SCOPE_HINT.dimension}
              enabled={hasDimension}
              onPress={(): void => navigateToEntityList('dimension', 'Dimension')}
            />
            <ScopeRow
              label={'Player'}
              hint={SCOPE_HINT.player}
              enabled={hasPlayer}
              onPress={canPickAnyPlayer
                ? (): void => navigateToEntityList('player', 'Player')
                : navigateToOwnPlayer}
            />
          </Panel>
        </Scroll>
      </Panel>
    </Card>
  );
}

/** One menu row for a scope, with a reset-icon button glued to its right when the scope resets in place. */
function ScopeRow({
  label,
  hint,
  enabled,
  onPress,
  onReset,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  // Allow an async handler: the presenter awaits it, holding the press's transaction open
  // so navigation completes before the form re-presents.
  onPress: () => unknown | Promise<unknown>;
  onReset?: () => void;
}): JSX.Element {
  return (
    <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.xs}>
      <Panel flexGrow={1}>
        <MenuRow
          title={{ text: label }}
          subtitle={{ text: hint }}
          enabled={enabled}
          onPress={onPress}
        />
      </Panel>
      {onReset
        ? (
            <OreButton variant={'secondary'} paddingLeft={spacing.sm} paddingRight={spacing.sm} paddingTop={0} paddingBottom={0} enabled={enabled} onPress={onReset}>
              <Image width={10} height={10} texture={ICON_RESET} />
            </OreButton>
          )
        : null}
    </Panel>
  );
}
