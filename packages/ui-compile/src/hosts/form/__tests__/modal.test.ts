import type { JSX } from '@bedrock-core/ui-runtime';
import { Form, Panel, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../../../__fixtures__/helpers';
import type { Control } from '../../../jsonui';
import { compileFormScreen } from '../compile';

/**
 * A compiled modal: one native field, and everything around it drawn by the pack.
 *
 * The split is the whole design. A `ModalFormData` row is instantiated by
 * vanilla's `collection_panel` factory and the widget inside it is the
 * engine's, so a compiled screen lays a field out but does not draw it. The
 * submit button is the opposite — not native at all, no `formValues` slot, and
 * the engine will not draw it — so the pack must.
 */
const Settings = (): JSX.Element => Form({
  children: Panel({
    padding: 6,
    gap: 4,
    children: [
      Text({ children: '§fSETTINGS' }),
      Form.Toggle({ name: 'sound', defaultValue: true }),
      Form.Button({ type: 'submit', label: 'Save' }),
    ],
  }),
});

describe('compiling a modal screen', () => {
  const compiled = compileFormScreen(Settings, { namespace: 'drav0011_shop', name: 'settings' });

  it('compiles a lowered field', () => {
    expect(compiled.namespace).toBe('drav0011_shop_settings');
    expect(compiled.title).toContain('drav0011_shop_settings');
  });

  it('places each field itself, with the row it was compiled against', () => {
    // A control the pack places owns a collection entry when it carries a
    // literal
    // `collection_index` under a host declaring the collection. That is what
    // lets a compiled screen put a field where the LAYOUT says instead of where
    // a generator would stack it — and it costs one control per field the
    // screen has, rather than the factory's machinery over the collection.
    const hosts: Control[] = [];

    eachControl(compiled.document, (_name, control) => {
      if (control.collection_name === 'custom_form') {
        hosts.push(control);
      }
    });

    expect(hosts).toHaveLength(1);

    const [host] = hosts;
    const [mounted] = host?.controls ?? [];
    const [name, child] = Object.entries(mounted ?? {})[0] ?? [];

    // The pack's own toggle, which takes its faces from the definition rather
    // than decoding them from a payload a compiled screen does not send. The
    // kinds without such a twin mount vanilla's row control instead.
    expect(name).toContain('@core_ui_form_components.compiled_toggle');
    expect(child?.collection_index).toBe(0);
  });

  it('numbers rows the way the runtime writes them', () => {
    // One numbering, shared: the index baked here is the index the presenter
    // writes the row at and the slot `formValues` answers in.
    const Ordered = (): JSX.Element => Form({
      children: Panel({
        children: [
          Text({ children: 'heading' }),
          Form.Toggle({ name: 'a' }),
          Form.Toggle({ name: 'b' }),
          Form.Button({ type: 'submit', label: 'Save' }),
        ],
      }),
    });

    const indices: number[] = [];

    eachControl(compileFormScreen(Ordered, { namespace: 'a', name: 'ordered' }).document, (_name, control) => {
      for (const entry of control.controls ?? []) {
        const [child] = Object.values(entry);

        if (typeof child?.collection_index === 'number') {
          indices.push(child.collection_index);
        }
      }
    });

    // Static decoration takes no row, so the two toggles are 0 and 1.
    expect(indices.sort()).toEqual([0, 1]);
  });

  it('draws the submit button itself, routed to the modal submit', () => {
    // Named from the interpreter's own `flow_button`, which routes here — not
    // guessed at.
    const json = JSON.stringify(compiled.document);

    expect(json).toContain('button.submit_custom_form');
    expect(json).not.toContain('button.form_button_click');
  });

  it('puts the submit caption inside each state face', () => {
    const buttons: Control[] = [];

    eachControl(compiled.document, (_name, control) => {
      if (control.button_mappings?.some(mapping => mapping.to_button_id === 'button.submit_custom_form') === true) {
        buttons.push(control);
      }
    });

    const [button] = buttons;

    expect(button).toBeDefined();

    const states = (button?.controls ?? []).map(entry => Object.keys(entry)[0] ?? '');

    expect(states.map(state => state.split('@')[0])).toEqual(['default', 'hover', 'pressed']);

    for (const state of states) {
      // A button draws the child its `*_control` names and nothing else of its
      // own, so each state is a shared face with the caption inside it.
      const face = compiled.faces[state.split('.')[1] ?? ''];

      expect(face?.controls?.map(child => Object.keys(child)[0])?.[1]).toMatch(/^caption@/);
    }
  });

  it('routes an exit button to the engine close instead of the submit', () => {
    const WithExit = (): JSX.Element => Form({
      children: Panel({
        children: [
          Form.Button({ type: 'submit', label: 'Save' }),
          Form.Button({ type: 'exit', label: 'Close' }),
        ],
      }),
    });

    const json = JSON.stringify(compileFormScreen(WithExit, { namespace: 'a', name: 'exiting' }).document);

    expect(json).toContain('button.submit_custom_form');
    expect(json).toContain('button.menu_exit');
  });

  it('hangs one popup router at the root per dropdown, with the cell baked in', () => {
    // The interpreted overlay's factory cannot pass per-row $variables and a
    // compiled row has no payload to decode them from, so the compiled screen
    // carries its own router per dropdown — outside the cell, because the one
    // attempt to mount it inside the native dropdown's subtree crashed the
    // client.
    const Choosing = (): JSX.Element => Form({
      children: Panel({
        width: 328,
        children: [
          Form.Toggle({ name: 'sound' }),
          Form.Dropdown({
            name: 'mode',
            popupBackground: 'mine/popup',
            children: [
              Form.Option({ value: 'easy', label: 'Easy' }),
              Form.Option({ value: 'hard', label: 'Hard' }),
            ],
          }),
          Form.Button({ type: 'submit', label: 'Save' }),
        ],
      }),
    });

    const { document } = compileFormScreen(Choosing, { namespace: 'a', name: 'choosing' });
    const routers: Control[] = [];

    eachControl(document, (_name, control) => {
      for (const entry of control.controls ?? []) {
        const [name, child] = Object.entries(entry)[0] ?? [];

        if (name?.includes('dropdown_popup_router') === true && child !== undefined) {
          routers.push(child);
        }
      }
    });

    expect(routers).toHaveLength(1);

    const [router] = routers;

    // The dropdown is row 1 (the toggle is row 0), and the router reads that
    // row's open-state channel — the only gate a compiled row can offer.
    expect(router?.collection_index).toBe(1);
    expect(router?.$compiled).toBe(true);
    expect(router?.$open_gate).toBe('#custom_dropdown');
    expect(router?.$popup_texture).toBe('mine/popup');
    expect(Array.isArray(router?.$popup_size)).toBe(true);

    // The routers hang in a host named after the screen, which every dropdown
    // of the screen names as its popup area — resolvable wherever the screen
    // is mounted, unlike the library container's host.
    const screen = document['screen'];
    const entries = typeof screen === 'object' && 'controls' in screen ? screen.controls ?? [] : [];

    expect(entries.some(entry => 'a_choosing_popups' in entry)).toBe(true);
  });

  it('takes the faces of a field from the author, never from the library', () => {
    // The base ships `unstyled` and nothing else. A texture on a compiled
    // screen is one the author wrote, exactly as a `Button`'s face is — a style
    // package is an author with opinions, not a thing the library knows about.
    const Styled = (): JSX.Element => Form({
      children: Panel({
        children: [
          Form.Toggle({ name: 'a', background: 'mine/off', checkedBackground: 'mine/on' }),
          Form.Button({ type: 'submit', label: 'Save' }),
        ],
      }),
    });

    const json = JSON.stringify(compileFormScreen(Styled, { namespace: 'a', name: 'styled' }).document);

    expect(json).toContain('mine/off');
    expect(json).toContain('mine/on');
    expect(json).not.toContain('ore-styled');
  });
});

describe('an inline select on a compiled modal', () => {
  const Picker = (): JSX.Element => Form({
    children: Panel({
      padding: 6,
      children: [
        Form.InlineSelect({
          name: 'view',
          defaultValue: 'third',
          bullet: 'mine/off',
          bulletSelected: 'mine/on',
          bulletWidth: 8,
          bulletHeight: 8,
          flexDirection: 'column',
          gap: 2,
          width: 120,
          children: [
            Form.Option({ value: 'first', label: 'First person', width: '100%', height: 17 }),
            Form.Option({ value: 'third', label: 'Third person', width: '100%', height: 17 }),
          ],
        }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    }),
  });

  const compiled = compileFormScreen(Picker, { namespace: 'a', name: 'picker' });

  const named = (document: Record<string, unknown>, wanted: (name: string) => boolean): [string, Control][] => {
    const found: [string, Control][] = [];

    eachControl(document as Parameters<typeof eachControl>[0], (name, control) => {
      if (wanted(name)) {
        found.push([name, control]);
      }
    });

    return found;
  };

  it('draws every option row in place, the default one selected', () => {
    const rows = named(compiled.preview.document, name => name.startsWith('option_'));

    expect(rows.map(([name]) => name)).toEqual(['option_0', 'option_1']);
    expect(rows[0]?.[1].offset).toEqual([0, 0]);
    expect(rows[1]?.[1].offset).toEqual([0, 19]);
    expect(rows[0]?.[1].size).toEqual([120, 17]);

    const bullets = rows.map(([, row]) => row.controls?.find(entry => 'bullet' in entry)?.['bullet']?.texture);

    expect(bullets).toEqual(['mine/off', 'mine/on']);

    const labels = rows.map(([, row]) => row.controls?.find(entry => 'label' in entry)?.['label']);

    expect(labels[0]?.text).toBe('First person');
    // Past the bullet and its gap, vertically centred in the row.
    expect(labels[0]?.offset?.[0]).toBe(12);
  });

  it('stands the engine selection in: an in-place dropdown owning placed radio toggles', () => {
    const [stub] = named(compiled.document, name => name.startsWith('stub@'));
    const hosts = named(compiled.document, name => name.startsWith('option_'));
    const rows = named(compiled.document, name => name === 'row');
    const toggles = named(compiled.document, name => name.startsWith('toggle@'));

    expect(stub?.[1].type).toBe('dropdown');
    expect(stub?.[1].dropdown_name).toBe('custom_dropdown');
    expect(stub?.[1].dropdown_content_control).toBe('content_0');
    // An index is legal only on a direct child of the control declaring the
    // collection, and a toggle takes none: each option is a stack declaring
    // it, whose one child carries the index and holds the toggle.
    expect(hosts.map(([, host]) => host.collection_name)).toEqual(['custom_dropdown', 'custom_dropdown']);
    expect(hosts[1]?.[1].offset).toEqual([0, 19]);
    expect(rows.map(([, row]) => row.collection_index)).toEqual([0, 1]);
    expect(toggles.map(([name]) => name.split('@')[1])).toEqual([
      'core_ui_form_components.compiled_option_toggle',
      'core_ui_form_components.compiled_option_toggle',
    ]);
    // A radio group of this row's own: two inline selects on one screen select apart.
    expect(toggles.map(([, toggle]) => toggle.toggle_name)).toEqual(['custom_dropdown_radio_toggle_0', 'custom_dropdown_radio_toggle_0']);
    expect(toggles[0]?.[1].controls?.map(entry => Object.keys(entry)[0])).toEqual([
      'unchecked', 'checked', 'unchecked_hover', 'checked_hover',
      'unchecked_locked', 'checked_locked', 'unchecked_locked_hover', 'checked_locked_hover',
    ]);
  });

  it('carries no variable into the mounted subtree', () => {
    const [field] = named(compiled.document, name => name === 'field');

    expect(JSON.stringify(field?.[1])).not.toContain('"$');
  });
});
