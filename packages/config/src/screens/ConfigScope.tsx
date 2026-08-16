/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, MenuRow, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import { Fragment, Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import { allowedScopes, isOperator } from '../permissions';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { patchScope } from '../config/values';
import { openConfig } from '../navigation/openConfig';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

const { spacing, fontColor } = theme.tokens;

const ICON_RESET = 'textures/ui/config/reset';

/**
 * Scope picker for one addon: a row per scope the addon actually declares — server, dimension,
 * player. Server jumps straight into the addon's world-wide settings. Dimension and player jump
 * into a select list of known dimensions / online players, each with its own edit and
 * reset-to-default entry. Every row's reset button resets that row's scope to the addon's
 * code-defined defaults.
 *
 * A scope the addon does not declare (or that this player may not open) is left OUT rather than
 * shown greyed: a permanently dead row is not information, and an addon with one scope should
 * read as a one-row screen, not as two thirds unavailable.
 */
export function ConfigScope({ navigation, route }: AppScreen<'ConfigScope'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { t, resolve } = useTranslation();
  const { addonId } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });
  // Resolved here, not passed down as a key: everything below builds breadcrumb STRINGS, and a
  // key that never reaches a `Text` renders as `drav0011_shop.meta.name`. resolve() is the
  // world resolver, so another addon's registry key becomes its display string.
  const nameKey = core.registry.get(addonId)?.packName ?? addonId;
  const addonName = resolve(nameKey) ?? nameKey;

  if (!accessor) { return <Missing navigation={navigation} addonId={addonId} />; }

  const configAccessor = accessor;
  const schema = getScopedSchema(configAccessor);

  const navigateToServer = async (): Promise<void> =>
    openConfig(navigation, configAccessor, { addonId, scope: 'server', breadcrumb: `${addonName} > ${t($ => $.scope.server.label)}` });

  const navigateToEntityList = (scope: 'dimension' | 'player', label: string): void => {
    navigation.navigate('EntityList', { addonId, scope, breadcrumb: `${addonName} > ${label}` });
  };

  /** A non-operator has exactly one player to pick, so the roster screen is skipped for them. */
  const navigateToOwnPlayer = async (): Promise<void> =>
    openConfig(navigation, configAccessor, { addonId, scope: 'player', entityId: player.id, breadcrumb: `${addonName} > ${player.name}` });

  const resetServerToSchemaDefaults = (): void => {
    patchScope(configAccessor, 'server', undefined, schemaDefaultsPatch(filterScope(schema, 'server')));
  };

  // Declared by the addon AND permitted for this player. `clampTarget` already keeps a deep link
  // from landing on a scope they may not open, but a non-operator can still walk List → addon and
  // arrive here, so the gate has to live on the rows too.
  const scopes = allowedScopes(player);
  const canPickAnyPlayer = isOperator(player);
  const hasServer = Object.keys(filterScope(schema, 'server')).length > 0 && scopes.includes('server');
  const hasDimension = Object.keys(filterScope(schema, 'dimension')).length > 0 && scopes.includes('dimension');
  const hasPlayer = Object.keys(filterScope(schema, 'player')).length > 0 && scopes.includes('player');

  const rows: JSX.Element[] = [];

  if (hasServer) {
    rows.push(
      <ScopeRow
        label={t($ => $.scope.server.label)}
        hint={t($ => $.scope.server.hint)}
        onPress={navigateToServer}
        onReset={resetServerToSchemaDefaults}
      />,
    );
  }

  if (hasDimension) {
    rows.push(
      <ScopeRow
        label={t($ => $.scope.dimension.label)}
        hint={t($ => $.scope.dimension.hint)}
        onPress={(): void => navigateToEntityList('dimension', t($ => $.scope.dimension.label))}
      />,
    );
  }

  if (hasPlayer) {
    rows.push(
      <ScopeRow
        label={t($ => $.scope.player.label)}
        hint={t($ => $.scope.player.hint)}
        onPress={canPickAnyPlayer
          ? (): void => navigateToEntityList('player', t($ => $.scope.player.label))
          : navigateToOwnPlayer}
      />,
    );
  }

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header
        title={{ text: addonName }}
        breadcrumbs={[{ text: t($ => $.config.breadcrumb) }]}
        onBack={(): void => navigation.goBack()}
        onClose={exit}
      />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.xs}>
            {rows.length > 0
              ? <Fragment>{rows}</Fragment>
              : (
                  <Panel justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
                    <Text>{`${fontColor.muted}${t($ => $.config.empty)}`}</Text>
                  </Panel>
                )}
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
  onPress,
  onReset,
}: {
  label: string;
  hint: string;
  // Allow an async handler: the presenter awaits it, holding the press's transaction open
  // so navigation completes before the form re-presents.
  onPress: () => unknown | Promise<unknown>;
  onReset?: () => void;
}): JSX.Element {
  return (
    <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.xs}>
      <Panel flexGrow={1}>
        <MenuRow title={{ text: label }} subtitle={{ text: hint }} onPress={onPress} />
      </Panel>
      {onReset ? <ResetButton onPress={onReset} /> : null}
    </Panel>
  );
}

/**
 * The reset affordance: square at whatever height the row turns out to be, so it tracks a
 * one-line row and a two-line row alike.
 *
 * `height: '100%'` is what makes that work, and it is not redundant with the row's `stretch`.
 * `aspectRatio` transfers the DEFINITE axis onto the auto one, and with both axes auto it treats
 * WIDTH as the driver — width then came from the 10px icon and the button collapsed to a 10px
 * square. A percent height is definite once resolved, so it becomes the driver and the width
 * follows it.
 */
export function ResetButton({ onPress }: { onPress: () => void }): JSX.Element {
  return (
    <OreButton
      variant={'secondary'}
      height={'100%'}
      aspectRatio={1}
      paddingLeft={0}
      paddingRight={0}
      paddingTop={0}
      paddingBottom={0}
      onPress={onPress}
    >
      <Image width={10} height={10} texture={ICON_RESET} />
    </OreButton>
  );
}
