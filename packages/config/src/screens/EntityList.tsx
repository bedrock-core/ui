/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, MenuRow, theme } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { splitBreadcrumb } from './breadcrumbs';
import { ResetButton } from './ConfigScope';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import { allowedScopes, isOperator } from '../permissions';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { getRoster, patchScope } from '../config/values';
import { openConfig } from '../navigation/openConfig';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

const { spacing, fontColor } = theme.tokens;

/**
 * Select list for a 'dimension' or 'player' scope: one row per known entity
 * (known dimensions, or currently online players), each with its own edit
 * button (jumps into that entity's settings) and reset button (resets that
 * entity to the addon's code-defined defaults).
 */
export function EntityList({ navigation, route }: AppScreen<'EntityList'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { t } = useTranslation();
  const { addonId, scope, breadcrumb } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });

  if (!accessor) { return <Missing navigation={navigation} addonId={addonId} />; }

  const configAccessor = accessor;
  const schema = filterScope(getScopedSchema(configAccessor), scope);
  // A non-operator has no business seeing a roster of other players or of dimensions they
  // cannot edit. `ConfigScope` already routes them past this screen; this keeps the list
  // honest for any other way of arriving here.
  const roster = allowedScopes(player).includes(scope)
    ? getRoster(scope).filter(entry => isOperator(player) || entry.id === player.id)
    : [];

  const navigateToEntity = async (entityId: string, name: string): Promise<void> =>
    openConfig(navigation, configAccessor, { addonId, scope, entityId, breadcrumb: `${breadcrumb} > ${name}` });

  const resetEntity = (entityId: string): void => {
    patchScope(configAccessor, scope, entityId, schemaDefaultsPatch(schema));
  };

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header {...splitBreadcrumb(breadcrumb)} onBack={(): void => navigation.goBack()} onClose={exit} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.xs}>
            {roster.length === 0
              ? (
                  <Panel justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
                    <Text>{`${fontColor.muted}${scope === 'player' ? t($ => $.roster.noPlayers) : t($ => $.roster.noDimensions)}`}</Text>
                  </Panel>
                )
              : roster.map(entity => (
                  <EntityRow
                    label={entity.name}
                    onPress={(): Promise<void> => navigateToEntity(entity.id, entity.name)}
                    onReset={(): void => resetEntity(entity.id)}
                  />
                ))}
          </Panel>
        </Scroll>
      </Panel>
    </Card>
  );
}

/** One menu row for an entity, with a reset-icon button glued to its right. */
function EntityRow({
  label,
  onPress,
  onReset,
}: {
  label: string;
  // Allow an async handler: the presenter awaits it, holding the press's transaction open
  // so navigation completes before the form re-presents.
  onPress: () => unknown | Promise<unknown>;
  onReset: () => void;
}): JSX.Element {
  return (
    <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.xs}>
      <Panel flexGrow={1}>
        <MenuRow title={label} onPress={onPress} />
      </Panel>
      <ResetButton onPress={onReset} />
    </Panel>
  );
}
