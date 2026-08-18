/** @jsxImportSource @bedrock-core/ui-runtime */
import { type JSX } from '@bedrock-core/ui-runtime';
import { createGuide, hasVisiblePages, type GuideAudience, type GuideManifest, type GuideProps } from '@bedrock-core/guides';
import { useCore, usePlayer } from '../context';
import { manifestFor } from '../frameworkGuide';
import { guideAudienceFor } from '../permissions';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

/**
 * `createGuide` is called ONCE per addon and cached — the returned component owns
 * the guide's open-page state, so rebuilding it every render would snap back to
 * the home screen. Keyed by addon id and re-created only if the addon republishes
 * a different manifest (identity check). Module scope, not a hook: the cache must
 * outlive this screen unmounting each time the user returns to the List.
 *
 * The AUDIENCE is part of the key, not just the addon id. A guide is built for one audience —
 * its landing page, sidebar, and pagination are all resolved from what that audience can see —
 * and this cache is shared by every player in the world, so keying by addon alone would hand
 * the first operator's copy of a guide to the next player who opened it.
 */
const guideCache = new Map<string, { manifest: GuideManifest; Guide: (props: GuideProps) => JSX.Element }>();

function guideFor(manifest: GuideManifest, addonId: string, audience: GuideAudience, title: string): (props: GuideProps) => JSX.Element {
  const key = `${audience}:${addonId}`;
  const hit = guideCache.get(key);

  if (hit && hit.manifest === manifest) { return hit.Guide; }

  const Guide = createGuide(manifest, { title, audience });

  guideCache.set(key, { manifest, Guide });

  return Guide;
}

/** Hosts one addon's self-contained guide; the guide drives its own home ⇆ page. */
export function Guide({ navigation, route }: AppScreen<'Guide'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const { addonId } = route.params;
  const manifest = manifestFor(core, addonId);
  const audience = guideAudienceFor(player);

  // A guide with nothing in it for this reader is the same dead end as an addon that never
  // published one, and reads as such. `clampTarget` already keeps a command from landing here,
  // and the List button is disabled — this catches the third way in: a realm running an older
  // copy of this UI, which pushed the route without knowing access existed.
  if (!manifest || !hasVisiblePages(manifest, audience)) { return <Missing navigation={navigation} addonId={addonId} />; }

  const GuideComponent = guideFor(manifest, addonId, audience, '§0Guide');

  return <GuideComponent onExit={(): void => navigation.goBack()} />;
}
