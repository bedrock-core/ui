import { exhaustiveDeps } from './core-hooks.mjs';
import { compilerRule, rulesOfHooks, globals, componentHookFactories, immutability } from './react-hooks.mjs';

export const ruleCoverage = {
  'exhaustive-deps': { mode: 'adapted', reason: 'Core effect captures, import aliases and stable runtime handles.' },
  'rules-of-hooks': { mode: 'adapted', reason: 'Upstream code-path checks with Core import-alias recognition.' },
  'component-hook-factories': { mode: 'adapted', reason: 'Forbid construction during render; allow predeclared Core factories.' },
  'static-components': { mode: 'reused', reason: 'Keep component definitions outside active rendering.' },
  globals: { mode: 'adapted', reason: 'Reject shared assignments and collection mutations during render.' },
  immutability: { mode: 'adapted', reason: 'Upstream analysis recognizes Core state imports and readonly props.' },
  purity: { mode: 'reused', reason: 'Impure calls belong in events, effects or initializers.' },
  'set-state-in-render': { mode: 'adapted', reason: 'Recognize Core setters and reject unconditional render updates.' },
  'set-state-in-effect': { mode: 'adapted', reason: 'Recognize Core setters and prevent synchronous update cascades.' },
  'error-boundaries': { mode: 'adapted', reason: 'JSX construction does not execute child components; report Core host handling.' },
  refs: { mode: 'not-applicable', reason: 'Core explicitly supports render-time ref reads and latest-value writes.' },
  config: { mode: 'not-applicable', reason: 'Core uses its own compiler and configuration schema.' },
  gating: { mode: 'not-applicable', reason: 'React Compiler gating is not a Core execution mode.' },
  'incompatible-library': { mode: 'not-applicable', reason: 'The React memoization compatibility list does not govern Core.' },
  'preserve-manual-memoization': { mode: 'not-applicable', reason: 'Core has no useMemo, useCallback or React memo pass.' },
  'unsupported-syntax': { mode: 'not-applicable', reason: 'React Compiler syntax limits do not describe the Core compiler.' },
  'use-memo': { mode: 'not-applicable', reason: 'Core does not export useMemo.' },
};

const plugin = {
  meta: { name: '@bedrock-core/ui/eslint' },
  rules: {
    'exhaustive-deps': exhaustiveDeps,
    'rules-of-hooks': rulesOfHooks,
    'component-hook-factories': componentHookFactories,
    globals,
    immutability,
    ...Object.fromEntries(['static-components', 'purity', 'set-state-in-render', 'set-state-in-effect', 'error-boundaries']
      .map(name => [name, compilerRule(name)])),
  },
  configs: {},
};

plugin.configs.recommended = {
  name: '@bedrock-core/ui/hooks/recommended',
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  plugins: { 'core-hooks': plugin },
  rules: Object.fromEntries(Object.keys(plugin.rules).map(name => ['core-hooks/' + name, 'error'])),
};

export default plugin;

