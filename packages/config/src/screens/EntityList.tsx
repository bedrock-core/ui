/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button as OreButton, Card, theme } from '@bedrock-core/ore-styled';
import { Button, Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { allowedScopes, isOperator } from '../permissions';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { getRoster, patchScope } from '../config/values';
import { openConfig } from '../navigation/openConfig';
import type { AppScreen } from '../navigation/routes';
import { NoConfig } from './NoConfig';

const { spacing, fontColor } = theme.tokens;

const HEADER_BG = 'textures/ui/ore-styled/header/background';
const ICON_BACK = 'textures/ui/ore-styled/button/back/background';
const ICON_BACK_HOVER = 'textures/ui/ore-styled/button/back/background_hover';
const ICON_BACK_PRESSED = 'textures/ui/ore-styled/button/back/background_pressed';
const ICON_CLOSE = 'textures/ui/ore-styled/button/close/background';
const ICON_CLOSE_HOVER = 'textures/ui/ore-styled/button/close/background_hover';
const ICON_CLOSE_PRESSED = 'textures/ui/ore-styled/button/close/background_pressed';
const ICON_RESET = 'textures/ui/config/reset';

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
  const { addonId, scope, breadcrumb } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });

  if (!accessor) { return <NoConfig onBack={(): void => navigation.goBack()} />; }

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
      <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'} padding={spacing.sm} marginTop={1} marginLeft={1} marginRight={1} background={HEADER_BG}>
        <Button width={15} height={15} background={ICON_BACK} backgroundHover={ICON_BACK_HOVER} backgroundPressed={ICON_BACK_PRESSED} onPress={(): void => navigation.goBack()} />
        <Panel position={'absolute'} left={spacing.sm} right={spacing.sm} top={spacing.sm} bottom={spacing.sm} justifyContent={'center'} alignItems={'center'}>
          <Text font={'minecraftTen'} scale={1} offsetY={-2}>{breadcrumb}</Text>
        </Panel>
        <Button width={15} height={15} background={ICON_CLOSE} backgroundHover={ICON_CLOSE_HOVER} backgroundPressed={ICON_CLOSE_PRESSED} onPress={exit} />
      </Panel>
      <Scroll>
        <Panel flexDirection={'column'} gap={spacing.sm} padding={spacing.sm}>
          {roster.length === 0
            ? <Text>{`${fontColor.muted}${scope === 'player' ? 'No players online.' : 'No dimensions found.'}`}</Text>
            : roster.map(entity => (
                <EntityRow
                  label={entity.name}
                  onPress={(): Promise<void> => navigateToEntity(entity.id, entity.name)}
                  onReset={(): void => resetEntity(entity.id)}
                />
              ))}
        </Panel>
      </Scroll>
    </Card>
  );
}

/** One row: an entity button with a transparent reset-icon button glued to its right. */
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
    <Panel flexDirection={'row'} gap={spacing.xs}>
      <Panel flexGrow={1}>
        <OreButton variant={'primary'} onPress={onPress}>{label}</OreButton>
      </Panel>
      <OreButton variant={'secondary'} paddingLeft={spacing.sm} paddingRight={spacing.sm} paddingTop={spacing.xs} paddingBottom={spacing.xs} onPress={onReset}>
        <Image width={10} height={10} texture={ICON_RESET} marginBottom={spacing.xs} />
      </OreButton>
    </Panel>
  );
}
