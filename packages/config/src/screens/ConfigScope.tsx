/** @jsxImportSource @bedrock-core/ui-runtime */
import { Button as OreButton, Card, theme } from '@bedrock-core/ore-styled';
import { Button, Image, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { useCore } from '../CoreContext';
import { buildNestedPatch, filterScope, getScopedSchema, getScopeValues, patchScope, type FlatSchemaLike } from '../configUtils';
import type { AppScreen } from '../routes';

const { spacing } = theme.tokens;

const HEADER_BG = 'textures/ui/ore-styled/header/background';
const ICON_BACK = 'textures/ui/ore-styled/button/back/background';
const ICON_BACK_HOVER = 'textures/ui/ore-styled/button/back/background_hover';
const ICON_BACK_PRESSED = 'textures/ui/ore-styled/button/back/background_pressed';
const ICON_CLOSE = 'textures/ui/ore-styled/button/close/background';
const ICON_CLOSE_HOVER = 'textures/ui/ore-styled/button/close/background_hover';
const ICON_CLOSE_PRESSED = 'textures/ui/ore-styled/button/close/background_pressed';
const ICON_RESET = 'textures/ui/config/reset';

/** Flat patch of every entry's code (schema) default. */
function schemaDefaultsPatch(schema: FlatSchemaLike): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(schema)) { flat[key] = entry.default; }

  return buildNestedPatch(flat);
}

/**
 * Scope picker for one addon: three rows — server, dimension, player. Server
 * jumps straight into the addon's server-wide settings. Dimension and player
 * jump into a select list of known dimensions / online players, each with its
 * own edit and reset-to-default entry. Every row's reset button resets that
 * row's scope to the addon's code-defined defaults.
 */
export function ConfigScope({ navigation, route }: AppScreen<'ConfigScope'>): JSX.Element {
  const core = useCore();
  const exit = useExit();
  const { addonId } = route.params;
  const accessor = core.config.of(addonId);

  if (!accessor) {
    return (
      <Card flexDirection={'column'} padding={12} gap={spacing.sm}>
        <Text>{'No published config for this addon.'}</Text>
        <Button onPress={(): void => navigation.goBack()}>{'Back'}</Button>
      </Card>
    );
  }

  const configAccessor = accessor;
  const addonName = core.registry.get(addonId)?.name ?? addonId;
  const schema = getScopedSchema(configAccessor);

  // Values are fetched over RPC BEFORE navigating, so the Config screen renders
  // complete on first paint. Returning the promise keeps the press's interactive
  // transaction open until navigation happens, so the form re-presents ONCE on the new
  // screen (a fire-and-forget fetch would re-present the old screen first — "press twice").
  // On failure we stay on this screen and log.
  const navigateToServer = async (): Promise<void> => {
    try {
      const values = await getScopeValues(configAccessor, 'server', undefined);

      navigation.navigate('Config', { addonId, scope: 'server', entityId: undefined, breadcrumb: `${addonName} > Server`, values });
    } catch (e: unknown) {
      console.warn(`[bc-config] fetching '${addonId}' values failed: ${String(e)}`);
    }
  };

  const navigateToEntityList = (scope: 'dimension' | 'player', label: string): void => {
    navigation.navigate('EntityList', { addonId, scope, breadcrumb: `${addonName} > ${label}` });
  };

  const resetServerToSchemaDefaults = (): void => {
    patchScope(configAccessor, 'server', undefined, schemaDefaultsPatch(filterScope(schema, 'server')));
  };

  const hasServer = Object.keys(filterScope(schema, 'server')).length > 0;
  const hasDimension = Object.keys(filterScope(schema, 'dimension')).length > 0;
  const hasPlayer = Object.keys(filterScope(schema, 'player')).length > 0;

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
            onPress={(): void => navigateToEntityList('player', 'Player')}
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
