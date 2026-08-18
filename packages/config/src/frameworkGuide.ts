/**
 * The built-in guide for bedrock-core itself.
 *
 * The framework has a row in the addon list but no realm behind it — nothing calls
 * `core.register()` on its behalf — so it can never publish a guide the way an addon does. This
 * manifest stands in, served locally by the `Guide` screen instead of read from replicated state.
 *
 * Unlike an addon's guide it is hand-written rather than emitted by the guides filter, but it
 * still points at real localization keys. Literal prose would not survive the trip: a key is sent
 * to the client as a string and the form serializer caps those at 80 bytes, so anything longer
 * than a short phrase has to resolve client-side instead. The values are this package's own
 * TYPED resources (`src/i18n/en_US.ts`, `guides.commands.*` → real keys `core.guides.commands.*`):
 * the i18n filter folds them into every consuming realm's bundle and generated `.lang`, which is
 * what paints, measures, and translates them everywhere. Admonition titles are
 * `@bedrock-core/guides`' own typed resources (`core.guides.adm.*`), the renderer's default.
 */
import { isGuideManifest } from '@bedrock-core/guides';
import type { GuideManifest } from '@bedrock-core/guides';
import type { Runtime } from '@bedrock-core/server-runtime';

/** The list row and guide id for the framework's own entry. Not a namespace — nothing registers it. */
export const FRAMEWORK_ADDON_ID = 'bedrock-core';

const PAGE = 'commands';
const K = 'core.guides.commands';

export const frameworkGuide: GuideManifest = {
  v: 1,
  ns: 'bedrock_core',
  defaultLocale: 'en_US',
  locales: ['en_US'],
  // Declared even though a single-page guide would open here anyway: it says the landing screen
  // is deliberate, so adding a second page later does not silently move it behind a sidebar.
  home: PAGE,
  tree: [{ t: 'page', id: PAGE, titleK: `${K}.nav` }],
  pages: {
    [PAGE]: {
      id: PAGE,
      titleK: ``,
      blocks: [
        // `w`/`h` are the DRAWN size, not the texture's 2042x266 — the renderer caps height and
        // derives width from w/h, so passing the source dimensions would draw it 900 units wide.
        { t: 'img', src: 'textures/ui/bedrock_core/title', w: 115, h: 15 },
        { t: 'p', runs: [{ k: `${K}.intro` }] },
        { t: 'p', runs: [{ k: `${K}.namespace` }] },
        {
          t: 'ul',
          items: [
            { runs: [{ k: `${K}.cmd_config` }] },
            { runs: [{ k: `${K}.cmd_get` }] },
            { runs: [{ k: `${K}.cmd_set` }] },
            { runs: [{ k: `${K}.cmd_add` }] },
            { runs: [{ k: `${K}.cmd_remove` }] },
            { runs: [{ k: `${K}.cmd_guide` }] },
            { runs: [{ k: `${K}.cmd_list` }] },
          ],
        },
        { t: 'p', runs: [{ k: `${K}.autocomplete` }] },
        { t: 'p', runs: [{ k: `${K}.lists` }] },
        { t: 'h', l: 2, k: `${K}.h2` },
        { t: 'p', runs: [{ k: `${K}.operators` }] },
        {
          t: 'ul',
          items: [
            { runs: [{ k: `${K}.cmd_getat` }] },
            { runs: [{ k: `${K}.cmd_setat` }] },
            { runs: [{ k: `${K}.cmd_addat` }] },
          ],
        },
        { t: 'p', runs: [{ k: `${K}.scoped` }] },
        { t: 'adm', kind: 'tip', blocks: [{ t: 'p', runs: [{ k: `${K}.tip` }] }] },
      ],
    },
  },
};

/**
 * The guide behind an addon id, or `undefined` if there is none to render.
 *
 * The runtime replicates manifests without inspecting them, so what comes back from
 * `core.guides.of` is the framework's opaque two-field envelope; narrowing here is the point
 * where the payload becomes a document, and a peer publishing something malformed reads as
 * "no guide" rather than crashing the screen that renders it.
 *
 * Shared by every caller that has to ask — the list row, the command clamp, and the guide
 * screen itself — so the framework's own manifest is stood in for exactly once.
 */
export function manifestFor(core: Runtime, addonId: string): GuideManifest | undefined {
  if (addonId === FRAMEWORK_ADDON_ID) { return frameworkGuide; }

  const stored = core.guides.of(addonId);

  return isGuideManifest(stored) ? stored : undefined;
}
