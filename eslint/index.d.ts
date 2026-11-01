import type { ESLint, Linter } from 'eslint';

/** The Core runtime contract used to include or exclude an upstream check. */
export interface RuleCoverage {
  readonly mode: 'adapted' | 'reused' | 'not-applicable';
  readonly reason: string;
}

/** Coverage decisions for the upstream recommended React Hooks checks. */
export const ruleCoverage: Readonly<Record<string, RuleCoverage>>;

/** Core component and hook rules, with a flat-config recommended preset. */
declare const plugin: ESLint.Plugin & {
  configs: { recommended: Linter.Config };
};

export default plugin;
