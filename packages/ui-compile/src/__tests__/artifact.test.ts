import { describe, expect, it } from 'vitest';
import { demoScreen } from '../__fixtures__/demo';
import { buildRouter, type CompiledScreen } from '../compile';
import { emit } from '../emit';
import { child, definition } from '../__fixtures__/helpers';

/**
 * The reference screen's JSON UI, as the router would reach it. The filter
 * writes the real files; this checks the two things the router depends on and
 * would fail silently on: the namespace and the definition names.
 */
describe('the reference screen', () => {
  const document = emit(demoScreen);
  const compiled: CompiledScreen = {
    name: 'demo',
    namespace: demoScreen.namespace,
    layoutId: 1,
    entity: demoScreen.entity,
    document,
    allocation: demoScreen.allocation,
    hasBackdrop: true,
    hasText: true,
  };

  it('is addressable by the chest router', () => {
    // If either half moves, the container renders empty with nothing in the
    // log to explain why.
    const router = buildRouter([compiled]);
    const gate = definition(router, 'core_ui_gate_demo');

    for (const entry of gate.controls ?? []) {
      for (const name of Object.keys(entry)) {
        const [, reference] = name.split('@');
        const [namespace, target] = (reference ?? '').split('.');

        expect(namespace).toBe(document.namespace);
        expect(definition(document, target ?? '')).toBeDefined();
      }
    }

    expect(child(definition(router, 'small_chest_panel'), 'core_ui_demo@chest.core_ui_host_demo')).toEqual({});
  });

  it('references only definitions the router owns', () => {
    // A hideOwned grid draws its cells with the router's transport-hiding
    // renderer, named as a plain value rather than an `@` base.
    const router = buildRouter([compiled]);
    const referenced = JSON.stringify(document).match(/chest\.[a-z_]+/g) ?? [];

    expect(referenced.length).toBeGreaterThan(0);

    for (const reference of referenced) {
      expect(definition(router, reference.slice('chest.'.length))).toBeDefined();
    }
  });

  it('round-trips through JSON unchanged', () => {
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('never mints a bcui name', () => {
    expect(JSON.stringify(document)).not.toContain('bcui');
  });
});
