/** @jsxImportSource @bedrock-core/ui-runtime */
import type { DisplayText } from '@bedrock-core/i18n';
import type { RemoteConfigAccessor, Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, render } from '@bedrock-core/ui-runtime';
import { world, type Player } from '@minecraft/server';
import {
  buildSectionTree, filterScope, filterScopeGroups, findSection, getScopedGroups, getScopedSchema, isPureSection,
  listEntries, schemaDefaultsPatch, type SectionNode,
} from '../config/schema';
import { buildNestedPatch, resolveInitialValue, toItems } from '../config/nested';
import { getRoster, patchScope } from '../config/values';
import { i18n, translationsFor } from '../i18n';
import { allowedScopes, isOperator } from '../permissions';
import type { ConfigScope, EntrySchema } from '../types';
import { ConfirmReset, confirmResetElement } from './confirm.screen';
import { MENU_ROWS, MenuList, menuListElement, pageOf, type MenuListRow } from './menu.screen';
import { ScopePicker, scopePickerElement } from './picker.screen';
import { ITEM_FIELD, shapedElement, shapedItemScreen, shapedScreen } from './shaped';

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

/** Whether this build carries the editor the rows and the list items are typed in. */

/** Where the picker sends a press it does not answer itself. */
export interface ScopePickerOpeners {
  /** Opens one scope of the addon: its roster, its sections, or its editor. */
  scope: (addonId: string, scope: ConfigScope) => unknown | Promise<unknown>;
  /** Where Back leads: the addon list, on the addon. */
  back: (addonId: string) => unknown | Promise<unknown>;
}

const { key } = i18n;

/** The addon's display name as a reference: its key, which the client resolves; its id when it is not registered. */
const addonNameOf = (core: Runtime, addonId: string): DisplayText => ({ translate: core.registry.get(addonId)?.packName ?? addonId });

/** A scope's label as a reference. */
const scopeLabelOf = (scope: ConfigScope): DisplayText => ({
  translate: scope === 'server'
    ? key($ => $.scope.server.label)
    : scope === 'dimension' ? key($ => $.scope.dimension.label) : key($ => $.scope.player.label),
});

/** What a dimension or player is called on screen: the player's name, the dimension's id. */
const entityNameOf = (scope: ConfigScope, entityId: string): string =>
  (scope === 'player' ? world.getAllPlayers().find(candidate => candidate.id === entityId)?.name ?? entityId : entityId);

/** Where in the addon's config a screen is: the addon, the scope, the entity, the sections. */
export interface ConfigPlace {
  addonId: string;
  scope?: ConfigScope;
  entityId?: string;
  /** Dot-path of the level within the scope; `''` or absent is the scope root. */
  path?: string;
}

/**
 * The trail a config screen is titled with, as references: the addon's and
 * the scope's keys, the entity's name, and the key of every section down to
 * the level. The client resolves each in the player's language.
 */
export function trailOf(core: Runtime, player: Player, place: ConfigPlace): DisplayText[] {
  const { addonId, scope, entityId, path = '' } = place;
  const trail: DisplayText[] = [addonNameOf(core, addonId)];

  if (scope === undefined) {
    return trail;
  }

  trail.push(scopeLabelOf(scope));

  if (scope !== 'server' && entityId !== undefined) {
    trail.push(entityNameOf(scope, entityId));
  }

  const accessor = core.config.of(addonId, { actorId: player.id });

  if (accessor === undefined || path === '') {
    return trail;
  }

  const root = buildSectionTree(
    filterScope(getScopedSchema(accessor), scope),
    filterScopeGroups(getScopedGroups(accessor), scope),
  );

  // Every prefix of the path names a level; each contributes its label.
  const segments = path.split('.');

  for (let depth = 1; depth <= segments.length; depth += 1) {
    const section = findSection(root, segments.slice(0, depth).join('.'));

    if (section !== undefined) {
      trail.push({ translate: section.label });
    }
  }

  return trail;
}

/** A trail as one string, for the serialized screens that title themselves with text. */
export function trailText(core: Runtime, player: Player, trail: readonly DisplayText[]): string {
  const { display } = translationsFor(core.translations.forPlayer(player));

  return trail.map(segment => display(segment)).join(' > ');
}

export function presentScopePicker(core: Runtime, player: Player, addonId: string, openers: ScopePickerOpeners): void {
  const { t } = translationsFor(core.translations.forPlayer(player));
  const accessor = core.config.of(addonId, { actorId: player.id });
  const addonName = addonNameOf(core, addonId);
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

      presentConfirmReset(core, player, {
        trail: [addonName, scopeLabelOf('server')],
        target: t($ => $.scope.server.label),
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
  trail: readonly DisplayText[];
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
    trail: request.trail,
    question: t($ => $.reset.question, { target: request.target }),
    onConfirm: request.onConfirm,
    onCancel: request.onCancel,
  }), player);
}

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
  const accessor = core.config.of(addonId, { actorId: player.id });
  const trail = trailOf(core, player, { addonId, scope });
  const roster = accessor !== undefined && allowedScopes(player).includes(scope)
    ? getRoster(scope).filter(entry => isOperator(player) || entry.id === player.id)
    : [];
  const shown = pageOf(roster, page);

  const again = (at = shown.page): void => { presentEntityRoster(core, player, target, openers, at); };

  render(menuListElement({
    trail,
    rows: shown.rows.map((entry): MenuListRow => ({ title: entry.name, action: 'reset' })),
    empty: { translate: scope === 'player' ? key($ => $.roster.noPlayers) : key($ => $.roster.noDimensions) },
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
        trail: [...trail, entry.name],
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
  /** The trail the screen is titled with, as references. */
  trail: readonly DisplayText[];
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
  const section = sectionAt(core, player, target);
  const children = section?.children ?? [];
  const lists = section === undefined ? [] : listEntries(section);
  const all: MenuListRow[] = [
    ...children.map((child): MenuListRow => ({ title: { translate: child.label }, ...child.description === undefined ? {} : { subtitle: { translate: child.description } } })),
    ...lists.map(([, entry]): MenuListRow => ({ title: { translate: entry.label }, ...entry.description === undefined ? {} : { subtitle: { translate: entry.description } } })),
  ];
  const shown = pageOf(all, page);

  const parent = (): unknown => {
    if (target.path === '') {
      return openers.back(target);
    }

    // Up one level: the path and the trail both lose their last segment.
    const path = target.path.slice(0, Math.max(0, target.path.lastIndexOf('.')));
    const trail = target.trail.slice(0, -1);

    return openLevel(core, player, { ...target, path, trail }, openers);
  };

  render(menuListElement({
    trail: target.trail,
    rows: shown.rows,
    empty: { translate: key($ => $.config.empty) },
    page: shown.page,
    pages: shown.pages,
    onRow: (index): unknown => {
      const at = (shown.page - 1) * MENU_ROWS + index;
      const child = children[at];

      if (child !== undefined) {
        return openLevel(core, player, { ...target, path: child.path, trail: [...target.trail, { translate: child.label }] }, openers);
      }

      const list = lists[at - children.length];

      return list === undefined
        ? undefined
        : openers.list({ ...target, key: list[0], trail: [...target.trail, { translate: list[1].label }] });
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

/**
 * One list setting, as a screen of its items.
 *
 * A list is the one entry type the native modal has no control for, which is
 * why a form cannot hold one: there is nothing to draw, and no third button to
 * route an editor from. A screen of rows has neither limit, so a list reached
 * from a section level gets a real editor here.
 *
 * A ROW IS THE ITEM: pressing it edits that item, and the button beside it
 * removes it. Splitting the two is what lets a row be pressed at all — with
 * remove on the row itself there is no gesture left for editing, and the
 * destructive action is the easy one to hit.
 *
 * Every change writes immediately. There is no Save: a list is one value
 * holding the whole array, so each edit is already a complete, valid value.
 * Staging them would only add a way to lose work by backing out, on a screen
 * where every action is one press to undo.
 */
export function presentListEditor(
  core: Runtime,
  player: Player,
  target: SectionTarget & { key: string },
  values: Record<string, unknown>,
  openers: SectionListOpeners,
  page = 1,
): void {
  const accessor = core.config.of(target.addonId, { actorId: player.id });
  const entry = accessor === undefined ? undefined : filterScope(getScopedSchema(accessor), target.scope)[target.key];

  if (accessor === undefined || entry === undefined) {
    void openers.back(target);

    return;
  }

  const items = toItems(resolveInitialValue(target.key, entry, values));
  const isEnum = entry.itemType === 'enum' && entry.options !== undefined;
  const full = entry.maxItems !== undefined && items.length >= entry.maxItems;

  /**
   * What an enum-item list may still offer. Everything already in is excluded
   * — except the item being edited, which has to stay in its own dropdown or
   * that row could not keep its value.
   */
  const optionsFor = (index?: number): string[] => {
    const taken = new Set(index === undefined ? items : items.filter((_: string, at: number) => at !== index));

    return [...entry.options ?? []].filter(option => !taken.has(option));
  };

  const canAdd = !full && (!isEnum || optionsFor().length > 0);

  /** Stage and write in one step — see the note above about why there is no Save. */
  const commit = (next: string[], at = page): void => {
    patchScope(accessor, target.scope, target.entityId, buildNestedPatch({ [target.key]: next }));
    presentListEditor(core, player, target, { ...values, [target.key]: next }, openers, at);
  };

  const rows: MenuListRow[] = [
    ...items.map((item): MenuListRow => ({ title: item, action: 'remove' })),
    ...canAdd ? [{ title: { translate: key($ => $.list.add) } } satisfies MenuListRow] : [],
  ];
  const shown = pageOf(rows, page);

  render(menuListElement({
    trail: target.trail,
    rows: shown.rows,
    empty: { translate: key($ => $.list.empty) },
    page: shown.page,
    pages: shown.pages,
    onRow: (index): void => {
      const at = (shown.page - 1) * MENU_ROWS + index;

      presentItemEditor(player, target, at < items.length ? at : undefined, {
        current: items[at] ?? '',
        options: isEnum ? optionsFor(at < items.length ? at : undefined) : undefined,
        apply: (item: string): void => {
          if (item === '') {
            presentListEditor(core, player, target, values, openers, page);

            return;
          }

          if (at >= items.length) {
            // A duplicate is dropped rather than reported: the enum path cannot
            // produce one, so the only way here is retyping a string already in.
            commit(items.includes(item) ? items : [...items, item]);

            return;
          }

          commit(items[at] !== item && items.includes(item)
            ? items
            : items.map((existing: string, other: number) => (other === at ? item : existing)));
        },
      });
    },
    onReset: (index): void => {
      const at = (shown.page - 1) * MENU_ROWS + index;

      if (at < items.length) {
        const next = items.filter((_: string, other: number) => other !== at);

        // The last item of the last page leaves that page behind.
        commit(next, Math.min(page, Math.max(1, Math.ceil((next.length + 1) / MENU_ROWS))));
      }
    },
    onPage: (at): void => { presentListEditor(core, player, target, values, openers, at); },
    onBack: (): unknown => openers.back(target),
  }), player);
}

/**
 * One item of a list, on the screen its list was shaped a screen for.
 *
 * A list has no native modal control, so an item is edited on its own: a text
 * field where the items are free strings, a dropdown of what is still available
 * where they come from a set. Which of the set is still free is known only now,
 * so it travels rather than being baked — the engine reads a dropdown's options
 * off the modal row either way.
 */
function presentItemEditor(
  player: Player,
  target: SectionTarget & { key: string },
  index: number | undefined,
  item: { current: string; options?: string[]; apply: (value: string) => void },
): void {
  const screen = shapedItemScreen(target.scope, target.key);

  if (screen === undefined) {
    console.warn(`[config] no shaped item screen for ${target.scope} list '${target.key}'`);

    return;
  }

  // No parameter: the trail already ends with the list's own label, so the
  // segment says which of the two this is and nothing more.
  const label: DisplayText = {
    translate: index === undefined ? key($ => $.list.add) : key($ => $.list.editTitle),
  };

  render(shapedElement(screen, {
    trail: [...target.trail, label],
    values: { [ITEM_FIELD]: item.current },
    ...item.options === undefined ? {} : { options: { [ITEM_FIELD]: item.options } },
    onSubmit: (values): void => { item.apply(String(values[ITEM_FIELD] ?? '')); },
  }), player);
}

/**
 * One section's settings, on the screen this addon's build shaped for them.
 *
 * The generic editor had to be told everything at present time — the labels,
 * which control each row shows, how many rows there are — because it was one
 * shape for every schema. A shaped screen was built against this section, so
 * the only thing that travels is the values, and they ride the modal rows the
 * engine reads anyway.
 */
export function presentShapedEditor(
  accessor: RemoteConfigAccessor,
  player: Player,
  target: SectionTarget,
  values: Record<string, unknown>,
): boolean {
  const screen = shapedScreen(target.scope, target.path);

  if (screen === undefined || compiledTitleOf(screen) === undefined) {
    return false;
  }

  const schema = filterScope(getScopedSchema(accessor), target.scope);

  render(shapedElement(screen, {
    trail: target.trail,
    values,
    onSubmit: (submitted: Record<string, unknown>): void => {
      const patch: Record<string, unknown> = {};

      for (const [key, raw] of Object.entries(submitted)) {
        const entry = schema[key];
        const value = entry === undefined ? undefined : settingValue(entry, raw);

        if (value !== undefined) {
          patch[key] = value;
        }
      }

      patchScope(accessor, target.scope, target.entityId, buildNestedPatch(patch));
    },
  }), player);

  return true;
}

/**
 * A submitted field, back in the entry's own type.
 *
 * The engine reports what its control holds — a boolean from a toggle, a number
 * from a slider, a string from a box — and the schema says what the setting is.
 * A value outside the entry's range is clamped rather than refused: the control
 * that produced it was built from the same range, so an out-of-range answer is
 * a schema that moved, not a player doing something wrong.
 */
const settingValue = (entry: EntrySchema, raw: unknown): unknown => {
  if (entry.type === 'boolean') {
    return Boolean(raw);
  }

  if (entry.type === 'number') {
    const parsed = typeof raw === 'number' ? raw : Number(raw);

    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    return Math.min(entry.max ?? Number.POSITIVE_INFINITY, Math.max(entry.min ?? Number.NEGATIVE_INFINITY, parsed));
  }

  if (entry.type === 'enum') {
    // A dropdown reports the chosen INDEX; a radio reports the value itself.
    const chosen = typeof raw === 'number' ? entry.options?.[raw] : raw;

    return typeof chosen === 'string' && entry.options?.includes(chosen) === true ? chosen : undefined;
  }

  return typeof raw === 'string' ? raw : undefined;
};
