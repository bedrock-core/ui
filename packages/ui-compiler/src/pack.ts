import type { CompiledScreen } from './compile';
import { buildContainerPack } from './hosts/chest/pack';
import type { CompiledFormScreen } from './hosts/form/compile';
import { buildFormPack } from './hosts/form/pack';
import type { PlacedDocument } from './hosts/form/router';
import type { Document } from './jsonui';
import type { CompiledOreScreen } from './hosts/ore/compile';
import { ORE_CLIENT_SOURCE } from './hosts/ore/client';

/** Linked screens, vanilla hook merges and resource documents for one addon. */
export interface CompiledUiPack {
  /** Final screen documents and metadata, with addon-owned helper references. */
  screens: (CompiledScreen | CompiledFormScreen | CompiledOreScreen)[];
  /** Non-JSON-UI assets for experimental hosts; do not register in _ui_defs.json. */
  resources?: { file: string; text: string }[];
  /** Merge these documents into their vanilla resource paths. */
  hooks: PlacedDocument[];
  /** Routers and one shared helper document; write and register each file. */
  documents: PlacedDocument[];
}

/** Finalizes all UI hosts together, including the helpers they share. */
export function buildUiPack(screens: readonly (CompiledScreen | CompiledFormScreen | CompiledOreScreen)[], addon: string): CompiledUiPack {
  if (!/^[A-Za-z0-9_-]+$/.test(addon)) { throw new Error(`Invalid UI addon namespace: ${addon}`); }

  if (screens.some(screen => screen.addon !== addon)) { throw new Error('A UI pack must contain screens from one addon namespace.'); }

  const containers = screens.filter((screen): screen is CompiledScreen => 'host' in screen);
  const forms = screens.filter((screen): screen is CompiledFormScreen => !('host' in screen) && !('ore' in screen));
  const ore = screens.filter((screen): screen is CompiledOreScreen => 'ore' in screen);
  const containerPack = containers.length === 0 ? undefined : buildContainerPack(containers, addon);
  const formPack = forms.length === 0 ? undefined : buildFormPack(forms, addon);
  const packs = [containerPack, formPack].filter(pack => pack !== undefined);
  const helpers: Record<string, Exclude<Document[string], string>> = {};

  for (const pack of packs) {
    for (const [name, definition] of Object.entries(pack.support.document)) {
      if (typeof definition !== 'string') { helpers[name] = definition; }
    }
  }

  const support: Document = {
    namespace: `${addon}__ui_support`,
    ...Object.fromEntries(Object.entries(helpers).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
  };

  return {
    screens: [...packs.flatMap<CompiledScreen | CompiledFormScreen>(pack => pack.screens), ...ore],
    ...ore.length === 0
      ? {}
      : { resources: [
          { file: 'hbui/core-ore-client.js', text: ORE_CLIENT_SOURCE },
          ...ore.map(screen => ({ file: screen.ore.asset.slice(1), text: JSON.stringify(screen.ore) })),
        ] },
    hooks: [...containerPack?.hooks ?? [], ...formPack === undefined ? [] : [formPack.hook]],
    documents: [
      ...packs.map(pack => ({ file: pack.routerFile, document: pack.router })),
      ...packs.length === 0 ? [] : [{ file: `ui/core-ui/support/${addon}.json`, document: support }],
    ],
  };
}
