/** @jsxImportSource @bedrock-core/ui-runtime */
import { hasVisiblePages, isGuideReference, presentGuideReference } from '@bedrock-core/guides';
import type { RegisteredAddon, Runtime } from '@bedrock-core/server-runtime';
import { compiledTitleOf, embedMarker, FLAG_OFF, FLAG_ON, render } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { FRAMEWORK_ADDON_ID, manifestFor } from '../frameworkGuide';
import { i18n, translationsFor } from '../i18n';
import { guideAudienceFor } from '../permissions';
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

const rowsFor = (core: Runtime, player: Player): AddonListRow[] => {
  const { display } = translationsFor(core.translations.forPlayer(player));
  const registered: RegisteredAddon[] = core.registry.all();
  const runtimeVersion = registered.find(addon => addon.self)?.runtimeVersion ?? 'unknown';

  return [
    ...registered.map((addon): AddonListRow => ({
      id: addon.id,
      name: display(addon.packName),
      version: addon.version,
      ...addon.icon === undefined ? {} : { icon: addon.icon },
    })),
    // The framework itself, pinned last: nothing registers it, so its row is synthetic.
    { id: FRAMEWORK_ADDON_ID, name: display(key($ => $.framework.name)), version: runtimeVersion, icon: 'textures/ui/bedrock_core/icon' },
  ];
};

/**
 * The slot values for one addon's page: the marker, then each entry as the
 * page published it — except a press the host can already answer, whose
 * enabled state is the host's knowledge, not the page's.
 */
const pageSlots = (addonId: string, reference: AddonPageReference, hasConfig: boolean, hasGuide: boolean): string[] => {
  const values = reference.values.map((value, index) => {
    const target = reference.targets[index] ?? null;

    if (target === 'config') { return hasConfig ? FLAG_ON : FLAG_OFF; }

    if (target === 'guide') { return hasGuide ? FLAG_ON : FLAG_OFF; }

    return value;
  });

  return [embedMarker(addonId), ...values].slice(0, PAGE_SLOTS);
};

export function presentAddonList(core: Runtime, player: Player, openers: AddonListOpeners, selectedId?: string): void {
  const rows = rowsFor(core, player);
  const found = rows.findIndex(row => row.id === selectedId);
  const selected = found < 0 ? 0 : found;
  const current = rows[selected];
  const audience = guideAudienceFor(player);

  const show = (id: string | undefined): void => { presentAddonList(core, player, openers, id); };

  let main: AddonListMain = { kind: 'fallback' };
  let reference: AddonPageReference | undefined;

  if (current !== undefined && current.id === FRAMEWORK_ADDON_ID) {
    const manifest = manifestFor(core, FRAMEWORK_ADDON_ID);
    const hasGuide = manifest !== undefined && hasVisiblePages(manifest, audience);

    main = { kind: 'framework', hasGuide, onGuide: (): unknown => openers.guide(FRAMEWORK_ADDON_ID) };
  } else if (current !== undefined) {
    const published = core.pages.of(current.id);
    const guideReference = core.guides.referenceOf(current.id);
    const manifest = manifestFor(core, current.id);
    const hasConfig = core.config.of(current.id, { actorId: player.id }) !== undefined;
    const hasGuide = isGuideReference(guideReference) || (manifest !== undefined && hasVisiblePages(manifest, audience));

    if (isAddonPageReference(published)) {
      reference = published;
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

      const guideReference = core.guides.referenceOf(addonId);

      // A compiled guide is presented from its reference and the list waits
      // for it; the promise returned keeps the press's transaction open, and
      // the list presents itself again when the guide's last screen closes.
      if (isGuideReference(guideReference)) {
        return presentGuideReference(guideReference, player, { back: true });
      }

      return openers.guide(addonId);
    },
  };

  render(addonListElement(model), player);
}
