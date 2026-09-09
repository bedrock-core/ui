/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, MenuRow, Button as OreButton, theme } from '@bedrock-core/ore-styled';
import type { DisplayText } from '@bedrock-core/i18n';
import { Image, Panel, Screen, Text, useExit, type FunctionComponent, type JSX, type PressEvent } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import type { ConfigScope } from '../types';
import { FRAME } from './frame';

/**
 * The scope picker for one addon as a compiled screen: a row per scope the
 * addon declares and the player may open — server, dimension, player — with
 * the server row resetting in place.
 *
 * Which rows show is only known when the screen is shown, so each row sits
 * behind a carried visibility. The addon's name is a live title sent as its
 * key, which the client resolves like the baked labels and hints. A scope
 * that is not offered is left out rather than greyed.
 */

const { spacing, fontColor } = theme.tokens;

const ICON_RESET = 'textures/ui/config/reset';

/** Characters the live addon name reserves. */
const NAME_MAX = 16;

/** The reset button's edge: the row's height, so it reads as part of the row. */
const RESET_SIZE = 24;

// Keys localize on the client; a string that takes a colour code bakes in the package's default locale.
const { key, t } = i18n;

export interface PickerModel {
  /** The addon's display name: its key, resolved on the client. */
  addonName: DisplayText;
  /** The scopes offered, in the order the rows draw them. */
  scopes: readonly ConfigScope[];
  onScope?: (scope: ConfigScope, event: PressEvent) => unknown;
  /** Resets the server scope; only asked, never done, from here. */
  onReset?: (event: PressEvent) => unknown;
  onBack?: (event: PressEvent) => unknown;
}

export interface ScopePickerProps {
  model?: PickerModel;
}

const EMPTY_MODEL: PickerModel = { addonName: '', scopes: [] };

export const ScopePicker: FunctionComponent<ScopePickerProps> = ({ model = EMPTY_MODEL }: ScopePickerProps): JSX.Element => {
  const exit = useExit();
  const hasServer = model.scopes.includes('server');
  const hasDimension = model.scopes.includes('dimension');
  const hasPlayer = model.scopes.includes('player');
  const isEmpty = model.scopes.length === 0;

  return (
    <Screen>
      <Card variant={'raised'} width={FRAME.width} height={FRAME.height} flexDirection={'column'} padding={0} gap={0}>
        <Header segments={[{ text: model.addonName, maxLength: NAME_MAX }, key($ => $.config.breadcrumb)]} onBack={(event): unknown => model.onBack?.(event)} onClose={exit} />
        <Panel flexDirection={'column'} gap={spacing.xs} padding={spacing.sm}>
          {hasServer && (
            <Panel flexDirection={'row'} alignItems={'stretch'} gap={spacing.xs}>
              <Panel flexGrow={1}>
                <MenuRow title={key($ => $.scope.server.label)} subtitle={key($ => $.scope.server.hint)} onPress={(event): unknown => model.onScope?.('server', event)} />
              </Panel>
              <OreButton variant={'secondary'} width={RESET_SIZE} height={RESET_SIZE} paddingLeft={0} paddingRight={0} paddingTop={0} paddingBottom={0} onPress={model.onReset}>
                <Image width={10} height={10} texture={ICON_RESET} />
              </OreButton>
            </Panel>
          )}
          {hasDimension && (
            <MenuRow title={key($ => $.scope.dimension.label)} subtitle={key($ => $.scope.dimension.hint)} onPress={(event): unknown => model.onScope?.('dimension', event)} />
          )}
          {hasPlayer && (
            <MenuRow title={key($ => $.scope.player.label)} subtitle={key($ => $.scope.player.hint)} onPress={(event): unknown => model.onScope?.('player', event)} />
          )}
          {isEmpty && (
            <Panel justifyContent={'center'} alignItems={'center'} padding={spacing.lg}>
              <Text>{`${fontColor.muted}${t($ => $.config.empty)}`}</Text>
            </Panel>
          )}
        </Panel>
      </Card>
    </Screen>
  );
};

/** The picker filled with one present's model, for `render()`. */
export const scopePickerElement = (model: PickerModel): JSX.Element => <ScopePicker model={model} />;
