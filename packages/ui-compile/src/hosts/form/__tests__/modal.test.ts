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

  it('compiles at all, which an unlowered field used to prevent', () => {
    expect(compiled.namespace).toBe('drav0011_shop_settings');
    expect(compiled.title).toContain('drav0011_shop_settings');
  });

  it('places each field itself, with the row it was compiled against', () => {
    // MEASURED (S1, and again on `custom_form` in S3): a control the pack
    // places owns a collection entry when it carries a literal
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
    expect((button?.controls ?? []).map(entry => Object.keys(entry)[0])).toEqual(['default', 'hover', 'pressed']);

    for (const entry of button?.controls ?? []) {
      const [state] = Object.values(entry);

      // A button draws the child its `*_control` names and nothing else of its
      // own, so a caption beside the states would never be seen.
      expect(state?.controls?.map(child => Object.keys(child)[0])?.[1]).toMatch(/^caption@/);
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
    expect((document['screen']?.controls ?? []).some(entry => 'a_choosing_popups' in entry)).toBe(true);
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
