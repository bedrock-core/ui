import { Screen, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import * as compiler from '../index';

describe('compiler package entry', () => {
  it('exposes complete screen compilation and pack linking operations', () => {
    expect(Object.keys(compiler).sort()).toEqual(['buildUiPack', 'compileExperimentalOreScreen', 'compileFormScreen', 'compileScreen']);
  });

  it('links a screen compiled through the package entry', () => {
    const screen = compiler.compileFormScreen(() => Screen({ children: Text({ children: 'Hello' }) }), {
      namespace: 'api', name: 'home',
    });
    const pack = compiler.buildUiPack([screen], 'api');

    expect(pack.screens.map(compiled => compiled.name)).toEqual(['home']);
    expect(pack.hooks.length).toBeGreaterThan(0);
    expect(pack.documents.length).toBeGreaterThan(0);
  });
});
