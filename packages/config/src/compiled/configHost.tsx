/** @jsxImportSource @bedrock-core/ui-runtime */
import type { Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import {
  buildSectionTree, filterScope, filterScopeGroups, findSection, getScopedGroups, getScopedSchema, isPureSection,
  listEntries, schemaDefaultsPatch, type SectionNode,
} from '../config/schema';
import { getRoster, patchScope } from '../config/values';
import { translationsFor } from '../i18n';
import { allowedScopes, isOperator } from '../permissions';
import type { ConfigScope } from '../types';
import { ConfirmReset, confirmResetElement } from './confirm.screen';
import { MENU_ROWS, MenuList, menuListElement, pageOf, type MenuListRow } from './menu.screen';
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

/** Whether this build carries the compiled menu list the roster and the sections show on. */
export const canPresentMenuList = (): boolean => compiledTitleOf(MenuList) !== undefined;

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

/** The label of a scope, in the viewing player's language. */
const scopeLabelFor = (core: Runtime, player: Player, scope: ConfigScope): string => {
  const { t } = translationsFor(core.translations.forPlayer(player));

  return scope === 'server'
    ? t($ => $.scope.server.label)
    : scope === 'dimension' ? t($ => $.scope.dimension.label) : t($ => $.scope.player.label);
};

/** Where the roster sends a press it does not answer itself. */
export interface EntityRosterOpeners {
  /** Opens one entity's settings: its sections, or its editor. */
  entity: (addonId: string, scope: 'dimension' | 'player', entityId: string) => unknown | Promise<unknown>;
  /** Where Back leads: the addon's scope picker. */
  back: (addonId: string) => unknown | Promise<unknown>;
}

/**
 * The roster of a dimension or player scope: one row per known dimension or
 * online player the viewer may edit, each opening that entity's settings and
 * resetting them in place after asking.
 */
export function presentEntityRoster(
  core: Runtime,
  player: Player,
  target: { addonId: string; scope: 'dimension' | 'player' },
  openers: EntityRosterOpeners,
  page = 1,
): void {
  const { addonId, scope } = target;
  const { t } = translationsFor(core.translations.forPlayer(player));
  const accessor = core.config.of(addonId, { actorId: player.id });
  const title = `${addonNameFor(core, player, addonId)} > ${scopeLabelFor(core, player, scope)}`;
  const roster = accessor !== undefined && allowedScopes(player).includes(scope)
    ? getRoster(scope).filter(entry => isOperator(player) || entry.id === player.id)
    : [];
  const shown = pageOf(roster, page);

  const again = (at = shown.page): void => { presentEntityRoster(core, player, target, openers, at); };

  render(menuListElement({
    title,
    rows: shown.rows.map((entry): MenuListRow => ({ title: entry.name, reset: true })),
    empty: scope === 'player' ? t($ => $.roster.noPlayers) : t($ => $.roster.noDimensions),
    page: shown.page,
    pages: shown.pages,
    onRow: (index): unknown => {
      const entry = shown.rows[index];

      return entry === undefined ? undefined : openers.entity(addonId, scope, entry.id);
    },
    onReset: (index): void => {
      const entry = shown.rows[index];

      if (entry === undefined || accessor === undefined) {
        return;
      }

      presentConfirmReset(core, player, {
        title: `${title} > ${entry.name}`,
        target: entry.name,
        onConfirm: (): void => {
          patchScope(accessor, scope, entry.id, schemaDefaultsPatch(filterScope(getScopedSchema(accessor), scope)));
          again();
        },
        onCancel: (): void => { again(); },
      });
    },
    onPage: (at): void => { again(at); },
    onBack: (): unknown => openers.back(addonId),
  }), player);
}

/** One level of the config tree to show. */
export interface SectionTarget {
  addonId: string;
  scope: ConfigScope;
  entityId?: string;
  /** Dot-path of the level within the scope; `''` is the scope root. */
  path: string;
  /** The trail the screen is titled with, resolved for the viewing player. */
  title: string;
}

/** Where a level of the tree sends a press it does not answer itself. */
export interface SectionListOpeners {
  /** Opens a section holding settings: the editor for it. */
  editor: (target: SectionTarget) => unknown | Promise<unknown>;
  /** Opens one list setting's editor. `key` is the list's dot-path within the scope. */
  list: (target: SectionTarget & { key: string }) => unknown | Promise<unknown>;
  /** Where Back leads from the scope root: the roster, or the picker. */
  back: (target: SectionTarget) => unknown | Promise<unknown>;
}

/** The level of the tree `target` names, or undefined when the schema no longer holds it. */
const sectionAt = (core: Runtime, player: Player, target: SectionTarget): SectionNode | undefined => {
  const accessor = core.config.of(target.addonId, { actorId: player.id });

  if (accessor === undefined) {
    return undefined;
  }

  const root = buildSectionTree(
    filterScope(getScopedSchema(accessor), target.scope),
    filterScopeGroups(getScopedGroups(accessor), target.scope),
  );

  return findSection(root, target.path);
};

/** Whether the level `target` names holds sections and lists but no settings of its own. */
export const isSectionLevel = (core: Runtime, player: Player, target: SectionTarget): boolean => {
  const section = sectionAt(core, player, target);

  return section !== undefined && isPureSection(section);
};

/**
 * A level of the config tree that holds sections and no settings of its own:
 * one row per child section and per list setting, and nothing to submit. A
 * child holding settings opens the editor; one holding only sections opens
 * another level here. Nothing is fetched: only the editor needs values.
 */
export function presentSectionList(core: Runtime, player: Player, target: SectionTarget, openers: SectionListOpeners, page = 1): void {
  const { t, display } = translationsFor(core.translations.forPlayer(player));
  const section = sectionAt(core, player, target);
  const children = section?.children ?? [];
  const lists = section === undefined ? [] : listEntries(section);
  const all: MenuListRow[] = [
    ...children.map((child): MenuListRow => ({ title: display(child.label), ...child.description === undefined ? {} : { subtitle: display(child.description) } })),
    ...lists.map(([, entry]): MenuListRow => ({ title: display(entry.label), ...entry.description === undefined ? {} : { subtitle: display(entry.description) } })),
  ];
  const shown = pageOf(all, page);

  const parent = (): unknown => {
    if (target.path === '') {
      return openers.back(target);
    }

    // Up one level: the path and the trail both lose their last segment.
    const path = target.path.slice(0, Math.max(0, target.path.lastIndexOf('.')));
    const title = target.title.slice(0, Math.max(0, target.title.lastIndexOf(' > ')));

    return openLevel(core, player, { ...target, path, title }, openers);
  };

  render(menuListElement({
    title: target.title,
    rows: shown.rows,
    empty: t($ => $.config.empty),
    page: shown.page,
    pages: shown.pages,
    onRow: (index): unknown => {
      const at = (shown.page - 1) * MENU_ROWS + index;
      const child = children[at];

      if (child !== undefined) {
        return openLevel(core, player, { ...target, path: child.path, title: `${target.title} > ${display(child.label)}` }, openers);
      }

      const list = lists[at - children.length];

      return list === undefined
        ? undefined
        : openers.list({ ...target, key: list[0], title: `${target.title} > ${display(list[1].label)}` });
    },
    onPage: (at): void => { presentSectionList(core, player, target, openers, at); },
    onBack: parent,
  }), player);
}

/** Opens one level of the tree where buttons-or-editor is decided, the way a press decides it. */
export const openLevel = (core: Runtime, player: Player, target: SectionTarget, openers: SectionListOpeners): unknown => {
  if (isSectionLevel(core, player, target)) {
    presentSectionList(core, player, target, openers);

    return undefined;
  }

  return openers.editor(target);
};
