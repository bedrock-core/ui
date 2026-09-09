import type { JSX } from '@bedrock-core/ui-runtime';
import { Panel, Screen as ScreenRoot, Tabs, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileFormScreen } from '../hosts/form/compile';
import type { Control } from '../jsonui';
import { definition, eachControl } from '../__fixtures__/helpers';

/** Two panes, so a swap has something to swap to. */
const Screen = (): JSX.Element => ScreenRoot({ children: Panel({
  children: Tabs({
    width: 300,
    height: 120,
    tabHeight: 20,
    children: [
      Tabs.Tab({ label: 'One', background: 'a', backgroundSelected: 'a_on', children: Text({ children: 'first' }) }),
      Tabs.Tab({ label: 'Two', background: 'b', backgroundSelected: 'b_on', children: Text({ children: 'second' }) }),
    ],
  }),
}) });

const compiled = compileFormScreen(Screen, { namespace: 'a', name: 'tabbed' });

const toggles = (): Control[] => {
  const found: Control[] = [];

  eachControl(compiled.document, (_name, control) => {
    if (control.type === 'toggle') {
      found.push(control);
    }
  });

  return found;
};

describe('compiling Tabs', () => {
  it('emits one exclusive group, so picking a tab unpicks the others', () => {
    const group = toggles();

    expect(group).toHaveLength(2);
    expect(group.every(toggle => toggle.radio_toggle_group === true)).toBe(true);

    // One name for the group, and a distinct forced index per tab: two `<Tabs>`
    // on one screen must never pick each other's tabs.
    expect(new Set(group.map(toggle => toggle.toggle_name)).size).toBe(1);
    expect(group.map(toggle => toggle.toggle_group_forced_index)).toEqual([0, 1]);
  });

  it('defines all eight states, which is what stops a tab vanishing on hover', () => {
    // Measured in S4: a toggle draws the ONE child its current state names, so
    // a state left undefined is a control that disappears the moment the
    // pointer touches it.
    for (const toggle of toggles()) {
      const named = [
        toggle.checked_control, toggle.unchecked_control,
        toggle.checked_hover_control, toggle.unchecked_hover_control,
        toggle.checked_locked_control, toggle.unchecked_locked_control,
        toggle.checked_locked_hover_control, toggle.unchecked_locked_hover_control,
      ];

      expect(named.filter(name => name !== undefined)).toHaveLength(8);
      expect(toggle.controls).toHaveLength(8);
    }
  });

  it('gives every toggle the press wiring, without which it draws but never acts', () => {
    for (const toggle of toggles()) {
      expect(toggle.toggle_on_button).toBe('toggle.toggle_on');
      expect(toggle.toggle_off_button).toBe('toggle.toggle_off');
      expect(toggle.button_mappings ?? []).not.toHaveLength(0);
    }
  });

  it('puts the pane INSIDE the checked states and nowhere else', () => {
    // This is what makes the group client-only. A pane gated as a SIBLING would
    // need something outside the toggle to observe the state — and then the
    // state would have to be reported, which is the cost tabs exist to avoid.
    for (const toggle of toggles()) {
      for (const entry of toggle.controls ?? []) {
        const [name] = Object.keys(entry);
        const [face] = Object.values(entry);
        const children = (face?.controls ?? []).map(child => Object.keys(child)[0] ?? '');
        const hasPane = children.some(child => child.startsWith('pane@'));

        expect(hasPane, `${name ?? ''} should ${name?.startsWith('checked') === true ? '' : 'not '}hold the pane`)
          .toBe(name?.startsWith('checked') === true);
      }
    }
  });

  it('emits each pane once, referenced by both checked states', () => {
    expect(definition(compiled.document, 'tab_1_pane')).toBeDefined();
    expect(definition(compiled.document, 'tab_2_pane')).toBeDefined();
    expect(JSON.stringify(compiled.document)).toContain('first');
    expect(JSON.stringify(compiled.document)).toContain('second');
  });

  it('carries both faces through, so the chosen tab is not drawn blank', () => {
    // `withControl` returns only the props it knows, so a component prop that
    // rides through it is dropped in silence — which is exactly how the
    // selected face went missing and every chosen tab drew as nothing. A
    // missing texture does not warn; it is simply not there.
    const json = JSON.stringify(compiled.document);

    expect(json).toContain('a_on');
    expect(json).toContain('b_on');
    expect(json).toContain('"a"');
    expect(json).toContain('"b"');
  });

  it('shows the selected face only while its tab is chosen', () => {
    for (const toggle of toggles()) {
      for (const entry of toggle.controls ?? []) {
        const [name] = Object.keys(entry);
        const [face] = Object.values(entry);
        const texture = String(JSON.stringify(face?.controls?.[0] ?? {}));
        const chosen = name?.startsWith('checked') === true;

        expect(texture.includes('_on'), `${name ?? ''} face`).toBe(chosen);
      }
    }
  });
});
