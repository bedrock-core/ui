import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { Dropdown, Form, Option, Panel, Select } from '@bedrock-core/ui-runtime';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../../../__fixtures__/helpers';
import type { Control } from '../../../jsonui';
import { compileFormScreen } from '../compile';
import { buildFormPack } from '../pack';

describe('compiled dropdown scroll-content bounds', () => {
  const ShortDropdown = (): JSX.Element => Form({ children: Panel({ children: [
    jsx(Dropdown as unknown as FunctionComponent, { name: 'choice', children: [Option({ value: 'a', label: 'Alpha' })] }),
    Form.Button({ type: 'submit' }),
  ] }) });
  const InlineOptions = (): JSX.Element => Form({ children: Panel({ children: [
    jsx(Select, { name: 'choice', children: [
      Option({ value: 'a', label: 'Same' }),
      Option({ value: 'b', label: 'Same', visible: false }),
      Option({ value: 'c', label: 'Same' }),
    ] }),
    Form.Button({ type: 'submit' }),
  ] }) });
  const pack = buildFormPack([
    compileFormScreen(ShortDropdown, { namespace: 'collections', name: 'short' }),
    compileFormScreen(InlineOptions, { namespace: 'collections', name: 'inline' }),
  ], 'collections');

  it('bounds a short popup independently of inactive inline option indices', () => {
    const sizes: unknown[] = [];
    const indices: number[] = [];

    eachControl(pack.screens[0]!.document, (_name, control) => {
      if ('$options_size' in control) sizes.push(control.$options_size);
    });
    eachControl(pack.screens[1]!.document, (_name, control) => {
      if (typeof control.collection_index === 'number') indices.push(control.collection_index);
    });

    expect(sizes).toEqual([['100%', 17]]);
    expect(indices).toEqual([0, 0, 1, 2]);
  });

  it('preserves the native option factory binding', () => {
    const groups: Control[] = [];

    eachControl(pack.support.document, (_name, control) => {
      if (control.collection_name === 'custom_dropdown' && control.factory) groups.push(control);
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.bindings).toEqual([
      {
        binding_name: '#custom_dropdown_length', binding_type: 'collection',
        binding_condition: 'always',
        binding_collection_name: 'custom_form', binding_name_override: '#collection_length',
      },
    ]);
  });
});
