import type { JSX } from '../jsx';
import defaultData from '@bedrock-core/generated/translation-keys';
import { TranslationKeysContext } from './TranslationKeysContext';
import type { TranslationKeysMap } from './TranslationKeysMap';

interface TranslationKeysProviderProps {
  data?: TranslationKeysMap;
  children: JSX.Node;
}

export function TranslationKeysProvider({ data = defaultData, children }: TranslationKeysProviderProps): JSX.Element {
  return (
    <TranslationKeysContext value={data}>
      {children}
    </TranslationKeysContext>
  );
}
