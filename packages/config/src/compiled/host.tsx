/** @jsxImportSource @bedrock-core/ui-runtime */
import type { RegisteredAddon, Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, embedMarker, FLAG_OFF, FLAG_ON, presentReference, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { FRAMEWORK_ADDON_ID, guideKeyFor, screenReferenceFor } from '../frameworkGuide';
import { FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE } from '../generated/framework.generated';
import { i18n } from '../i18n';
import { PAGE_SLOTS } from './frame';
import { AddonList, addonListElement, type AddonListMain, type AddonListModel, type AddonListRow } from './list.screen';
import { isAddonPageReference, type AddonPageReference } from './page.screen';

/**
 * Showing the compiled addon list for one player.
 *
 * The host fills the sidebar from the registry, resolved for the player's
 * language, and the main area from what the selected addon published: its
 * page reference — the values its reserved entries are shown with and where
 * each press leads — with the marker written first so the addon's pack
 * draws the page. A selection is a re-render with another model; a press
 * on the page is answered here, since the page's own script is never run.
 */

/** Where the list sends a press it does not answer itself. */
export interface AddonListOpeners {
  config: (addonId: string) => unknown | Promise<unknown>;
  guide: (addonId: string) => unknown | Promise<unknown>;
}

/** Whether this build carries the compiled list. */
export const canPresentAddonList = (): boolean => compiledTitleOf(AddonList) !== undefined;

const { key } = i18n;

const rowsFor = (core: Runtime): AddonListRow[] => {
  const registered: RegisteredAddon[] = core.registry.all();
  const runtimeVersion = registered.find(addon => addon.self)?.runtimeVersion ?? 'unknown';

  return [
    ...registered.map((addon): AddonListRow => ({
      id: addon.id,
      name: { translate: addon.packName },
      version: addon.version,
      ...addon.icon === undefined ? {} : { icon: addon.icon },
    })),
    // The framework itself, pinned last: nothing registers it, so its row is synthetic.
    { id: FRAMEWORK_ADDON_ID, name: { translate: key($ => $.framework.name) }, version: runtimeVersion, icon: 'textures/ui/bedrock-core/icon' },
  ];
};

/**
 * The slot values for one addon's page: the marker, then each entry as the
 * page published it — except a press the host can already answer, whose
 * enabled state is the host's knowledge, not the page's.
 */
const pageSlots = (namespace: string, reference: AddonPageReference, hasConfig: boolean, hasGuide: boolean): string[] => {
  const values = reference.values.map((value, index) => {
    const target = reference.targets[index] ?? null;

    if (target === 'config') { return hasConfig ? FLAG_ON : FLAG_OFF; }

    if (target === 'guide') { return hasGuide ? FLAG_ON : FLAG_OFF; }

    return value;
  });

  return [embedMarker(namespace), ...values].slice(0, PAGE_SLOTS);
};

export function presentAddonList(core: Runtime, player: Player, openers: AddonListOpeners, selectedId?: string): void {
  const rows = rowsFor(core);
  const found = rows.findIndex(row => row.id === selectedId);
  const selected = found < 0 ? 0 : found;
  const current = rows[selected];

  const show = (id: string | undefined): void => { presentAddonList(core, player, openers, id); };

  let main: AddonListMain = { kind: 'fallback' };
  let reference: AddonPageReference | undefined;

  if (current !== undefined && current.id === FRAMEWORK_ADDON_ID) {
    // The framework's page and guide are the render pack's own; it has no config.
    reference = FRAMEWORK_PAGE;
    main = { kind: 'page', slots: pageSlots(FRAMEWORK_NAMESPACE, FRAMEWORK_PAGE, false, true) };
  } else if (current !== undefined) {
    const published = core.pages.of(current.id);
    const hasConfig = core.config.of(current.id, { actorId: player.id }) !== undefined;
    const hasGuide = guideKeyFor(core, current.id) !== undefined;

    if (isAddonPageReference(published)) {
      reference = published;
      // An addon's page is compiled under its id, which is its pack's namespace.
      main = { kind: 'page', slots: pageSlots(current.id, published, hasConfig, hasGuide) };
    }
  }

  const model: AddonListModel = {
    rows,
    selected,
    main,
    onSelect: (index: number): void => { show(rows[index]?.id); },
    onSlot: (slot: number): unknown => {
      const target = reference?.targets[slot - 1] ?? null;
      const addonId = current?.id;

      if (addonId === undefined || target === null) {
        return undefined;
      }

      console.info(`[ui] addon page ${addonId} press ${String(slot)} -> ${target}`);

      if (target === 'config') {
        return openers.config(addonId);
      }

      const guide = guideKeyFor(core, addonId, { back: true });

      // A compiled guide is walked from its references and the list waits for
      // it; the promise returned keeps the press's transaction open. A back out
      // of the guide's index returns to this list, which is where the player
      // pressed from; closing the form leaves the UI.
      if (guide !== undefined) {
        return presentReference(key => screenReferenceFor(core, key), guide, player)
          .then((ended): void => {
            if (ended === 'back') { presentAddonList(core, player, openers, addonId); }
          });
      }

      return openers.guide(addonId);
    },
  };

  render(addonListElement(model), player);
}
