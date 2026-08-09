/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, theme } from '@bedrock-core/ore-styled';
import { Button, Text, type JSX } from '@bedrock-core/ui-runtime';
import { createGuide, isGuideManifest, type GuideManifest, type GuideProps } from '@bedrock-core/guides';
import { useCore } from '../CoreContext';
import type { AppScreen } from '../routes';

const { spacing } = theme.tokens;

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
  // document — a peer publishing something malformed degrades to the empty state below
  // rather than crashing this screen.
  const stored = core.guides.of(addonId);
  const manifest = isGuideManifest(stored) ? stored : undefined;

  if (!manifest) {
    return (
      <Card flexDirection={'column'} padding={12} gap={spacing.sm}>
        <Text>{'No guide available for this addon.'}</Text>
        <Button onPress={(): void => navigation.goBack()}>{'Back'}</Button>
      </Card>
    );
  }

  const GuideComponent = guideFor(manifest, addonId, '§0Guide');

  return <GuideComponent onExit={(): void => navigation.goBack()} />;
}
