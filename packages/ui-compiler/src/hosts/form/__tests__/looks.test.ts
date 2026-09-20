import type { JSX } from '@bedrock-core/ui-runtime';
import { Button, compiledValuesOf, Panel, Screen as ScreenRoot, Text, useState } from '@bedrock-core/ui-runtime';
import { buildScreenOnce } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it, vi } from 'vitest';
import { definition, eachControl } from '../../../__fixtures__/helpers';
import { compileFormScreen } from '../compile';

/**
 * A look that follows state, as the form draws it.
 *
 * A compiled screen writes a texture into JSON UI once, so a button that
 * changes its own background — every toggle, checkbox and radio there is — has
 * to be drawn once per look with the choice carried. The entry says which look
 * is worn; the gates inside the button's own states show that one.
 */
const Toggling = (): JSX.Element => {
  const [on] = useState(true);

  return ScreenRoot({ children: Panel({ children: Button({
    background: on ? 'textures/ui/on' : 'textures/ui/off',
    onPress: () => undefined,
    children: Text({ children: 'flip' }),
  }) }) });
};

/** A segment of a chooser: the texture holds still and the caption does not. */
const Captioned = (): JSX.Element => {
  const [on] = useState(true);

  return ScreenRoot({ children: Panel({ children: Button({
    background: 'textures/ui/segment',
    onPress: () => undefined,
    children: Text({ color: on ? [1, 1, 1] : [0, 0, 0], children: 'A' }),
  }) }) });
};

/** A panel whose background follows state, holding something that does not. */
const Painted = (): JSX.Element => {
  const [on] = useState(true);

  return ScreenRoot({ children: Panel({ children: Panel({
    background: on ? 'textures/ui/on' : 'textures/ui/off',
    children: Text({ children: 'inside' }),
  }) }) });
};

/** A hugging press, as `<Trans>` draws a link: its face is shared without its children. */
const Hugging = (): JSX.Element => {
  const [on] = useState(true);

  return ScreenRoot({ children: Panel({ children: [
    Button({ hug: true, background: 'textures/ui/link', onPress: () => undefined, children: Text({ children: 'read this' }) }),
    Button({
      background: on ? 'textures/ui/on' : 'textures/ui/off',
      onPress: () => undefined,
      children: Text({ children: 'flip' }),
    }),
  ] }) });
};

describe('every face a press names', () => {
  it('is one the build emitted', () => {
    const compiled = compileFormScreen(Hugging, { namespace: 'demo', name: 'hugging' });
    const named = new Set<string>();

    eachControl(compiled.document, (name) => {
      const [, reference] = name.split('@');

      if (reference?.startsWith(`${compiled.facesNamespace}.`) === true) {
        named.add(reference.slice(compiled.facesNamespace.length + 1));
      }
    });

    expect(named.size).toBeGreaterThan(0);
    expect([...named].filter(face => compiled.faces[face] === undefined)).toEqual([]);
  });
});

describe('a button whose look follows state', () => {
  const compiled = compileFormScreen(Toggling, { namespace: 'demo', name: 'toggling' });

  it('spends one entry on which look is worn', () => {
    const looks = compiled.entries.filter(entry => entry.carrier === 'enum');

    expect(looks).toHaveLength(1);
    expect(looks[0]?.length).toBe(2);
  });

  it('draws a face per look, gated on that entry', () => {
    const states = definition(compiled.document, 'press_1_states');
    const [rest] = states.controls ?? [];
    const gate = rest?.['default'];

    expect(gate?.type).toBe('stack_panel');
    expect(gate?.collection_name).toBe('form_buttons');

    const gates = gate?.controls ?? [];

    expect(gates).toHaveLength(2);

    const [first, second] = gates.map(entry => Object.values(entry)[0]);

    // Seeded with the look the build drew, then decided by the entry.
    expect(first?.property_bag).toEqual({ '#visible': true });
    expect(second?.property_bag).toEqual({ '#visible': false });
    expect(first?.bindings?.[1]).toMatchObject({ source_property_name: "(#look = 'k0')", target_property_name: '#visible' });
    expect(second?.bindings?.[1]).toMatchObject({ source_property_name: "(#look = 'k1')", target_property_name: '#visible' });
  });

  it('records the looks so a render at runtime names the same one', () => {
    const [table] = compiled.snapshot.looks ?? [];

    expect(table?.props.map(read => read.prop)).toContain('background');
    expect(table?.combinations).toHaveLength(2);
    expect(table?.combinations[0]).toContain('textures/ui/on');
    expect(table?.combinations[1]).toContain('textures/ui/off');
  });

  it('draws the caption each look wears, not only the texture', () => {
    const compiled = compileFormScreen(Captioned, { namespace: 'demo', name: 'captioned' });
    const colours = Object.entries(compiled.faces)
      .filter(([name]) => name.endsWith('_content'))
      .map(([, face]) => face.controls?.[0]?.['c0']?.color);

    expect(colours).toEqual([[1, 1, 1], [0, 0, 0]]);
  });

  it('answers with the look the render is wearing', () => {
    const { values } = compiledValuesOf(buildScreenOnce(Toggling), compiled.snapshot);

    // The build's own look, since the render starts from the same state.
    expect(values).toContain('k0');
  });
});

describe('any other element whose look follows state', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const compiled = compileFormScreen(Painted, { namespace: 'demo', name: 'painted' });
  const warned = warn.mock.calls.map(([message]) => String(message));

  warn.mockRestore();

  it('is carried rather than reported', () => {
    expect(warned.filter(message => message.includes('baked prop'))).toEqual([]);
    expect(compiled.entries.filter(entry => entry.carrier === 'enum').map(entry => entry.length)).toEqual([2]);
  });

  it('is drawn once per look, each gated on its entry, with its children drawn once', () => {
    const gates: string[] = [];
    let inside = 0;

    eachControl(compiled.document, (_name, control) => {
      for (const binding of control.bindings ?? []) {
        if (binding.source_property_name?.includes('#look_value') === true) {
          gates.push(binding.source_property_name);
        }
      }

      if (control.text === 'inside') {
        inside += 1;
      }
    });

    expect(gates).toEqual(["(#look_value = 'k0')", "(#look_value = 'k1')"]);
    expect(inside).toBe(1);
  });

  it('answers with the look the render is wearing', () => {
    const { values } = compiledValuesOf(buildScreenOnce(Painted), compiled.snapshot);

    expect(values).toContain('k0');
  });
});

