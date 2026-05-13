import { createContext } from '../core/fabric/context';
import type { TranslationKeysMap } from './TranslationKeysMap';

/**
 * Context that provides the translation keys map (key → resolved string) to the component tree.
 *
 * At the root of your UI, import the generated JSON and wrap with this context:
 *
 * ```tsx
 * import translationKeys from './data/translationKeys.generated.json';
 *
 * render(
 *   <TranslationKeysContext value={translationKeys}>
 *     <MyScreen />
 *   </TranslationKeysContext>,
 *   player,
 * );
 * ```
 *
 * `Text` with a `localizationKey` prop reads from this context automatically to resolve
 * the display string for layout metrics (word-wrap, ellipsis, measureText).
 *
 * Without a provider, using `localizationKey` will throw a `TranslationKeysError` at
 * render time instructing you to install the `translation-keys` Regolith filter.
 */
export const TranslationKeysContext = createContext<TranslationKeysMap | null>(null);
