/** @jsxImportSource @bedrock-core/ui-runtime */
import { type JSX } from '@bedrock-core/ui-runtime';
import { createGuide, isGuideManifest, type GuideManifest, type GuideProps } from '@bedrock-core/guides';
import { useCore } from '../context';
import { FRAMEWORK_ADDON_ID, frameworkGuide } from '../frameworkGuide';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

/**
 * `createGuide` is called ONCE per addon and cached — the returned component owns
 * the guide's open-page state, so rebuilding it every render would snap back to
 * the home screen. Keyed by addon id and re-created only if the addon republishes
 * a different manifest (identity check). Module scope, not a hook: the cache must
 * outlive this screen unmounting each time the user returns to the List.
 */
const guideCache = new Map<string, { manifest: GuideManifest; Guide: (props: GuideProps) => JSX.Element }>();

function guideFor(manifest: GuideManifest, addonId: string, title: string): (props: GuideProps) => JSX.Element {
  const hit = guideCache.get(addonId);

  if (hit && hit.manifest === manifest) { return hit.Guide; }

  const Guide = createGuide(manifest, { title });

  guideCache.set(addonId, { manifest, Guide });

  return Guide;
}

/** Hosts one addon's self-contained guide; the guide drives its own home ⇆ page. */
export function Guide({ navigation, route }: AppScreen<'Guide'>): JSX.Element {
  const core = useCore();
  const { addonId } = route.params;
  // The runtime replicates manifests without inspecting them, so what comes back is the
  // framework's opaque envelope. Narrowing here is the point where the payload becomes a
  // document — a peer publishing something malformed bounces back to the list rather than
  // crashing this screen. bedrock-core's own guide has no realm to publish it, so it is served
  // from here instead.
  const stored = addonId === FRAMEWORK_ADDON_ID ? frameworkGuide : core.guides.of(addonId);
  const manifest = isGuideManifest(stored) ? stored : undefined;

  if (!manifest) { return <Missing navigation={navigation} addonId={addonId} />; }

  const GuideComponent = guideFor(manifest, addonId, '§0Guide');

  return <GuideComponent onExit={(): void => navigation.goBack()} />;
}
