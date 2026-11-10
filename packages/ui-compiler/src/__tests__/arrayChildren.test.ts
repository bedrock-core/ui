import { describe, expect, it } from 'vitest';
import { Button, Container, Panel, Screen, Text, useState, type FunctionComponent, type JSX } from '@bedrock-core/ui-runtime';
import { FragmentArrayChildren, MixedArrayChildren, NestedArrayChildren } from '../../../ui-runtime/src/__fixtures__/ArrayChildren';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';

const spec = { namespace: 'test', name: 'arrays' };
const FlatChildren = (): JSX.Element => Panel({ children: [
  Text({ children: 'Before' }),
  Button({ children: Text({ children: 'One' }) }),
  Button({ children: Text({ children: 'Two' }) }),
  Text({ children: 'After' }),
] });

describe('compiling array-valued JSX children', () => {
  it.each([
    { name: 'sibling arrays', component: MixedArrayChildren },
    { name: 'fragment-wrapped arrays', component: FragmentArrayChildren },
    { name: 'nested arrays', component: NestedArrayChildren },
  ])('emits the same layout and controls for $name as explicit children', ({ component }) => {
    const action = (body: FunctionComponent): ReturnType<typeof compileFormScreen> =>
      compileFormScreen(() => Screen({ children: { type: body, props: {} } }), spec);
    const chest = (body: FunctionComponent): ReturnType<typeof compileScreen> =>
      compileScreen(() => Container({ entity: 'test:arrays', children: { type: body, props: {} } }), spec);

    for (const compile of [action, chest]) {
      const expected = compile(FlatChildren);
      const actual = compile(component);

      expect(actual.document).toEqual(expected.document);
      expect(actual.faces).toEqual(expected.faces);
      expect(actual.face.root).toEqual(expected.face.root);
    }
  });

  it('keeps visibility channels for mapped children', () => {
    const Visible = (): JSX.Element => {
      const [visible] = useState(true);

      return Screen({ children: { type: NestedArrayChildren, props: { visible } } });
    };
    const compiled = compileFormScreen(Visible, spec);

    expect(compiled.entries.filter(entry => entry.role === 'button')).toHaveLength(2);
    expect(compiled.snapshot.vis.length).toBeGreaterThan(0);
    expect(compiled.entries.some(entry => entry.carrier === 'bool')).toBe(true);
  });

  it('rejects state-dependent mapped child counts in compiled screens', () => {
    const Changing = (): JSX.Element => {
      const [count] = useState(1);

      return Screen({ children: Panel({ children: [
        Text({ children: 'Before' }),
        Array.from({ length: count }, () => Button({})),
        Text({ children: 'After' }),
      ] }) });
    };

    expect(() => compileFormScreen(Changing, spec)).toThrow('renders a different screen when its state changes');
  });
});
