import type { JSX } from '@bedrock-core/ui-runtime';
import { Panel, Screen as ScreenRoot, Tabs, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileFormScreen } from '../hosts/form/compile';
import type { Control } from '../jsonui';
import { defs, eachControl } from '../__fixtures__/helpers';

const header = (background: string, caption: string): JSX.Element =>
  Panel({ background, children: Text({ children: caption }) });

/** Two panes, so a swap has something to swap to. */
const Screen = (): JSX.Element => ScreenRoot({ children: Panel({
  children: Tabs({
    width: 300,
    height: 120,
    tabHeight: 20,
    children: [
      Tabs.Tab({
        header: header('a', 'One'),
        headerSelected: header('a_on', 'One'),
        children: Text({ children: 'first' }),
      }),
      Tabs.Tab({
        header: header('b', 'Two'),
        headerSelected: header('b_on', 'Two'),
        children: Text({ children: 'second' }),
      }),
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

/** The definition a state mounts, by the `look@ns.name` reference inside it. */
const lookOf = (toggle: Control, state: string): Control => {
  const entry = (toggle.controls ?? []).find(row => state in row);
  const mount = Object.keys((entry?.[state]?.controls ?? [])[0] ?? {})[0] ?? '';
  const name = mount.split('@')[1]?.replace('a_tabbed.', '') ?? '';

  return defs(compiled.document)[name] ?? {};
};

describe('compiling Tabs', () => {
  it('emits one exclusive group, so picking a tab unpicks the others', () => {
    const group = toggles();

    expect(group).toHaveLength(2);
    expect(group.every(toggle => toggle.radio_toggle_group === true)).toBe(true);

    // One name for the group, and a distinct forced index per tab: two `<Tabs>`
    // on one screen must never pick each other's tabs. The group is the first
    // swap's, which is what makes exclusive siblings one group with nothing
    // naming it.
    expect(new Set(group.map(toggle => toggle.toggle_name)).size).toBe(1);
    expect(group.map(toggle => toggle.toggle_group_forced_index)).toEqual([0, 1]);
  });

  it('shares the width evenly, so the headers tile the row', () => {
    const [first, second] = toggles();

    expect(first?.size).toEqual([150, 20]);
    expect(second?.size).toEqual([150, 20]);
    expect(first?.offset).toEqual([0, 0]);
    expect(second?.offset).toEqual([150, 0]);
  });

  it('defines all eight states, which is what stops a tab vanishing on hover', () => {
    // A toggle draws the ONE child its current state names, so a state left
    // undefined is a control that disappears the moment the pointer touches it.
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

  it('puts the pane INSIDE the checked look and nowhere else', () => {
    // This is what makes the group client-only, and what keeps a pane that is
    // not showing from being BUILT: a pane gated as a sibling would need
    // something outside the toggle to observe the state, and it would be
    // constructed either way.
    const [first, second] = toggles();

    expect(JSON.stringify(lookOf(first ?? {}, 'checked'))).toContain('first');
    expect(JSON.stringify(lookOf(first ?? {}, 'unchecked'))).not.toContain('first');
    expect(JSON.stringify(lookOf(second ?? {}, 'checked'))).toContain('second');
    expect(JSON.stringify(lookOf(second ?? {}, 'unchecked'))).not.toContain('second');
  });

  it('re-bases each pane into its own tab, so both fill the box below the headers', () => {
    // The pane is drawn after the header inside the look, which is where the
    // compile put it when it took it out of the sibling list.
    const paneOf = (toggle: Control): Control => {
      const rows = lookOf(toggle, 'checked').controls ?? [];

      return Object.values(rows[rows.length - 1] ?? {})[0] ?? {};
    };

    const [first, second] = toggles();

    // Solved beside the headers at (0, 20), then moved into a swap that sits at
    // x = 0 and x = 150: the same 300x100 box either way.
    expect(paneOf(first ?? {}).size).toEqual([300, 100]);
    expect(paneOf(first ?? {}).offset).toEqual([0, 20]);
    expect(paneOf(second ?? {}).size).toEqual([300, 100]);
    expect(paneOf(second ?? {}).offset).toEqual([-150, 20]);
  });

  it('leaves no pane beside the headers, since each was taken into a look', () => {
    // A pane left in the sibling list would be drawn outside every toggle,
    // which is the one place it must never be: visible whichever tab is chosen.
    // The group holds its two headers and nothing else.
    let group: Control | undefined;

    eachControl(compiled.document, (_name, control) => {
      if ((control.controls ?? []).some(entry => Object.values(entry)[0]?.type === 'toggle')) {
        group = control;
      }
    });

    expect(group?.controls).toHaveLength(2);
    expect((group?.controls ?? []).every(entry => Object.values(entry)[0]?.type === 'toggle')).toBe(true);
  });

  it('emits each look once, named by every state that draws it', () => {
    for (const toggle of toggles()) {
      const mounted = ['checked', 'checked_hover', 'checked_locked', 'checked_locked_hover']
        .map(state => JSON.stringify(lookOf(toggle, state)));

      expect(new Set(mounted).size).toBe(1);
    }
  });

  it('carries both looks through, so the chosen tab is not drawn blank', () => {
    // `withControl` returns only the props it knows, so a component prop that
    // rides through it is dropped in silence — a missing texture does not warn,
    // it is simply not there.
    const [first, second] = toggles();

    expect(JSON.stringify(lookOf(first ?? {}, 'checked'))).toContain('a_on');
    expect(JSON.stringify(lookOf(first ?? {}, 'unchecked'))).toContain('"a"');
    expect(JSON.stringify(lookOf(second ?? {}, 'checked'))).toContain('b_on');
    expect(JSON.stringify(lookOf(second ?? {}, 'unchecked'))).toContain('"b"');
  });
});
