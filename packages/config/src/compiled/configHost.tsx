/** @jsxImportSource @bedrock-core/ui-runtime */
import type { Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { patchScope } from '../config/values';
import { translationsFor } from '../i18n';
import { allowedScopes } from '../permissions';
import type { ConfigScope } from '../types';
import { ConfirmReset, confirmResetElement } from './confirm.screen';
import { ScopePicker, scopePickerElement } from './picker.screen';

/**
 * Showing the compiled config screens that lead up to the editor.
 *
 * Each is a screen of its own with no stack beneath it: what a press opens
 * and where Back leads are decided here, and going back is showing the
 * previous screen again. The editor itself is presented by `openConfig`.
 */

/** Whether this build carries the compiled scope picker. */
export const canPresentScopePicker = (): boolean => compiledTitleOf(ScopePicker) !== undefined;

/** Whether this build carries the compiled reset confirmation. */
export const canPresentConfirmReset = (): boolean => compiledTitleOf(ConfirmReset) !== undefined;

/** Where the picker sends a press it does not answer itself. */
export interface ScopePickerOpeners {
  /** Opens one scope of the addon: its roster, its sections, or its editor. */
  scope: (addonId: string, scope: ConfigScope) => unknown | Promise<unknown>;
  /** Where Back leads: the addon list, on the addon. */
  back: (addonId: string) => unknown | Promise<unknown>;
}

/** The addon's display name for the viewing player, or its id when it is not registered. */
const addonNameFor = (core: Runtime, player: Player, addonId: string): string => {
  const { resolve } = translationsFor(core.translations.forPlayer(player));
  const nameKey = core.registry.get(addonId)?.packName ?? addonId;

  return resolve(nameKey) ?? nameKey;
};

export function presentScopePicker(core: Runtime, player: Player, addonId: string, openers: ScopePickerOpeners): void {
  const { t } = translationsFor(core.translations.forPlayer(player));
  const accessor = core.config.of(addonId, { actorId: player.id });
  const addonName = addonNameFor(core, player, addonId);
  // Declared by the addon AND permitted for this player, in the order the rows draw.
  const schema = accessor === undefined ? {} : getScopedSchema(accessor);
  const scopes = accessor === undefined
    ? []
    : allowedScopes(player).filter(scope => Object.keys(filterScope(schema, scope)).length > 0);

  const again = (): void => { presentScopePicker(core, player, addonId, openers); };

  render(scopePickerElement({
    addonName,
    scopes,
    onScope: (scope): unknown => openers.scope(addonId, scope),
    onReset: (): void => {
      if (accessor === undefined) {
        return;
      }

      const label = t($ => $.scope.server.label);

      presentConfirmReset(core, player, {
        title: `${addonName} > ${label}`,
        target: label,
        onConfirm: (): void => {
          patchScope(accessor, 'server', undefined, schemaDefaultsPatch(filterScope(getScopedSchema(accessor), 'server')));
          again();
        },
        onCancel: again,
      });
    },
    onBack: (): unknown => openers.back(addonId),
  }), player);
}

/** What a reset asks about, and where each answer leads. */
export interface ConfirmResetRequest {
  /** The trail the screen is titled with. */
  title: string;
  /** What the question names: the scope's label, or the dimension or player being reset. */
  target: string;
  /** Performs the reset, then shows whatever comes next. */
  onConfirm: () => unknown;
  /** Shows the screen that asked. */
  onCancel: () => unknown;
}

export function presentConfirmReset(core: Runtime, player: Player, request: ConfirmResetRequest): void {
  const { t } = translationsFor(core.translations.forPlayer(player));

  render(confirmResetElement({
    title: request.title,
    question: t($ => $.reset.question, { target: request.target }),
    onConfirm: request.onConfirm,
    onCancel: request.onCancel,
  }), player);
}
