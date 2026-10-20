import { List, Panel, Screen, Scroll, SelectionPanel, Swap, Text, type JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../__fixtures__/helpers';
import { compileFormScreen } from '../hosts/form/compile';
import type { Control } from '../jsonui';

describe('generic native selection panels', () => {
  it('renders a selected panel from a persistent native input without a navigation library', () => {
    const component = (): JSX.Element => Screen({ children: Panel({ width: 120, height: 60, children: [
      Swap({ id: 'owner', group: 'choice', index: 0, exclusive: true, passive: true, defaultOn: true, width: 0, height: 0,
        children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })],
      }),
      SelectionPanel({ group: 'choice', index: 0, width: 120, height: 60,
        position: 'absolute', left: 0, top: 0, children: Text({ children: 'Selected content' }),
      }),
    ] }) });
    const compiled = compileFormScreen(component, { namespace: 'example', name: 'selection' });
    const controls: Control[] = [];

    eachControl(compiled.document, (_name, control) => controls.push(control));
    const owner = controls.find(control => control.type === 'toggle');
    const gate = controls.find(control => control.bindings?.some(binding => binding.source_control_name === 'example_selection_selection_choice_0'));

    expect(owner).toMatchObject({ focus_enabled: false, toggle_group_forced_index: 0, button_mappings: [] });
    expect(gate).toMatchObject({ type: 'panel', size: [120, 60], property_bag: { '#visible': true } });
    expect(gate?.bindings?.at(-1)?.target_property_name).toBe('#visible');
    expect(compiled.entries).toHaveLength(0);
  });

  it('shares one state source across repeated gates and reads each incoming input once', () => {
    const component = (): JSX.Element => Screen({ children: Panel({ width: 120, height: 60, children: [
      Swap({ id: 'owner', group: 'shared', index: 0, exclusive: true, passive: true, defaultOn: true, width: 0, height: 0, children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })] }),
      ...['first', 'second'].map(id => Swap({ id, group: 'shared', index: 0, exclusive: true, defaultOn: false, width: 20, height: 20, children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })] })),
      ...Array.from({ length: 30 }, () => SelectionPanel({ group: 'shared', index: 0, width: 120, height: 60 })),
    ] }) });
    const compiled = compileFormScreen(component, { namespace: 'example', name: 'shared' });
    const controls: Control[] = [];

    eachControl(compiled.document, (_name, control) => controls.push(control));
    const sources = controls.filter(control => control.bindings?.at(-1)?.target_property_name === '#navigation_selected');
    const readers = controls.filter(control => control.bindings?.some(binding => binding.source_control_name === 'example_shared_selection_shared_0'));

    expect(sources).toHaveLength(1);
    expect(sources[0]?.size).toEqual([0, 0]);
    expect(sources[0]?.bindings?.filter(binding => binding.source_property_name === '#toggle_state')).toHaveLength(3);
    expect(readers).toHaveLength(30);
    expect(compiled.entries).toHaveLength(0);
  });

  it('reads only the mounted width of native inputs in a list that fits its viewport', () => {
    const component = (): JSX.Element => Screen({ children: Panel({ width: 120, height: 100, children: [
      Swap({ id: 'owner', group: 'small', index: 0, exclusive: true, passive: true, defaultOn: true, width: 0, height: 0,
        children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })],
      }),
      Scroll({ width: 120, height: 60, children: List({ max: 1, items: ['one'],
        row: () => Swap({ group: 'small', index: 0, exclusive: true, width: 20, height: 20,
          children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })],
        }),
      }) }),
      SelectionPanel({ group: 'small', index: 0, width: 120, height: 20, children: Text({ children: 'Selected' }) }),
    ] }) });
    const compiled = compileFormScreen(component, { namespace: 'example', name: 'small' });
    const controls: Control[] = [];

    eachControl(compiled.document, (_name, control) => controls.push(control));
    const source = controls.find(control => control.bindings?.at(-1)?.target_property_name === '#navigation_selected');

    expect(controls.filter(control => control.type === 'toggle')).toHaveLength(2);
    expect(source?.bindings?.filter(binding => binding.source_property_name === '#toggle_state')).toHaveLength(2);
  });

  it('rejects a selected panel whose native group has no persistent owner', () => {
    const component = (): JSX.Element => Screen({ children: Panel({ width: 120, height: 60,
      children: SelectionPanel({ group: 'missing', index: 0, width: 120, height: 60 }),
    }) });

    expect(() => compileFormScreen(component, { namespace: 'example', name: 'orphan' })).toThrow('exactly one persistent owner');
  });

  it('shares one content subtree across selected indices and requires an owner for each index', () => {
    const component = (indexes: readonly number[]): (() => JSX.Element) => () => Screen({ children: Panel({ width: 120, height: 60, children: [
      ...[0, 1, 2].map(index => Swap({ id: `owner_${index}`, group: 'choice', index, exclusive: true, passive: true,
        defaultOn: index === 0, width: 0, height: 0,
        children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })],
      })),
      SelectionPanel({ group: 'choice', indexes, width: 120, height: 60,
        position: 'absolute', left: 0, top: 0, children: Text({ children: 'Shared content' }),
      }),
    ] }) });
    const compiled = compileFormScreen(component([0, 2]), { namespace: 'example', name: 'union' });
    const controls: Control[] = [];

    eachControl(compiled.document, (_name, control) => controls.push(control));
    const gate = controls.find(control => control.bindings?.some(binding => binding.source_control_name === 'example_union_selection_choice_2'));

    expect(controls.filter(control => control.type === 'label' && control.text === 'Shared content')).toHaveLength(1);
    expect(gate?.property_bag?.['#visible']).toBe(true);
    expect(gate?.bindings?.filter(binding => binding.source_control_name).map(binding => binding.source_control_name)).toEqual([
      'example_union_selection_choice_0', 'example_union_selection_choice_2',
    ]);
    expect(() => compileFormScreen(component([1, 3]), { namespace: 'example', name: 'missing' })).toThrow('exactly one persistent owner');
    expect(() => compileFormScreen(component([1, 1]), { namespace: 'example', name: 'duplicate' })).toThrow('selection index');
  });
});
