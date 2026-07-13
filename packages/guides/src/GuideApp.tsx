/** @jsxImportSource @bedrock-core/ui-runtime */
import { createStackNavigator, NavigationContainer, type NavigationState } from '@bedrock-core/navigation';
import { TranslationKeysContext, useRef, type JSX } from '@bedrock-core/ui-runtime';
import { createGuideScreens } from './createGuideScreens';
import type { GuideScreenOptions } from './screens/GuideContents';
import { staticGuideSource } from './source';
import type { GuideComponents, GuideManifest, GuideRoutes, PageId } from './types';

export interface GuideAppProps {
  /** The compiled manifest (`import guides from '@bedrock-core/generated/guides'`). */
  manifest: GuideManifest;
  /** Deep-link straight to a page (contents stays below it in the stack). */
  initialPageId?: PageId;
  /** Header title (raw text, colorable). Defaults to 'Guide'. */
  title?: string;
  /** Component registry for MDX `cmp` blocks. */
  components?: GuideComponents;
  /**
   * Translation key map for text metrics (`translationKeys.generated.json`).
   * Omit when a `TranslationKeysContext` provider already wraps this app.
   */
  translationKeys?: Record<string, string>;
}

type GuideStack = ReturnType<typeof createStackNavigator<GuideRoutes>>;

/**
 * Standalone guide app — owns its NavigationContainer. One-liner usage:
 *
 * ```tsx
 * import guides from '@bedrock-core/generated/guides';
 * import translationKeys from '@bedrock-core/generated/translation-keys';
 *
 * render(<GuideApp manifest={guides} translationKeys={translationKeys} />, player);
 * ```
 *
 * Embedding into an existing navigator? Use {@link createGuideScreens}.
 */
export function GuideApp({ manifest, initialPageId, title, components, translationKeys }: GuideAppProps): JSX.Element {
  // The navigator is created once per mount — recreating it on re-renders
  // would discard screen identity while navigation state lives in the container.
  const stackRef = useRef<GuideStack | null>(null);
  let Stack = stackRef.current;

  if (Stack === null) {
    Stack = createStackNavigator<GuideRoutes>({
      initialRouteName: 'GuideContents',
      screens: createGuideScreens(staticGuideSource(manifest), { title, components } satisfies GuideScreenOptions),
    });
    stackRef.current = Stack;
  }

  const initialState: Partial<NavigationState> | undefined = initialPageId !== undefined
    ? {
        routes: [
          { key: 'GuideContents', name: 'GuideContents' },
          { key: 'GuidePage', name: 'GuidePage', params: { pageId: initialPageId } },
        ],
        index: 1,
      }
    : undefined;

  const app = (
    <NavigationContainer initialState={initialState}>
      <Stack.Navigator />
    </NavigationContainer>
  );

  return translationKeys ? <TranslationKeysContext value={translationKeys}>{app}</TranslationKeysContext> : app;
}
