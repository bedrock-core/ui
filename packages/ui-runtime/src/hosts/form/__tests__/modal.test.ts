import type { Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { __lastModalForm, __resetFormMocks, __setModalFormResponses } from '../../../__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../../components';
import { Toggle } from '../../../components/Toggle';
import { Slider } from '../../../components/Slider';
import { Dropdown } from '../../../components/Dropdown';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Form } from '../../../components/Form';
import { Option } from '../../../components';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { playerOwner } from '../../../core/fabric';
import { findModalConfig } from '../../../core/render/present';
import { buildTree } from '../../../core/render/tree';
import type { JSX } from '../../../jsx';
import { titleFor } from '../contract';
import { presentCompiledModal } from '../modal';
import { lowerField } from '../../../__fixtures__/lowerField';

beforeAll(() => {
  registerNativeComponents();
});

afterEach(() => {
  __resetFormMocks();
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
const player = { id: 'compiled-modal' } as unknown as Player;

const TITLE = titleFor('drav0011_shop_settings');

/** Built the way `render()` builds a compiled screen: frozen layout, player owner. */
const build = (screen: () => JSX.Element): JSX.Element =>
  buildTree({ type: screen, props: {} }, playerOwner(player), true);

const present = async (screen: () => JSX.Element): Promise<unknown> => {
  const tree = build(screen);
  const config = findModalConfig(tree);

  expect(config).toBeDefined();

  return presentCompiledModal(player, tree, config!, TITLE);
};

describe('presenting a compiled modal', () => {
  const Settings = (onSubmit?: (event: { values: Record<string, unknown> }) => void) => (): JSX.Element =>
    Form({
      onSubmit,
      children: [
        Text({ children: '§fSETTINGS' }),
        lowerField(Toggle, { name: 'sound', defaultValue: true }),
        lowerField(Toggle, { name: 'music', defaultValue: false }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    });

  it('names the screen in the title instead of carrying its layout', async () => {
    await present(Settings());

    // The whole point. An interpreted modal writes its scroll geometry and its
    // submit/exit blocks here; a compiled one writes a key, because the layout
    // it names is already in the pack.
    expect(__lastModalForm()?.titleText).toBe(TITLE);
    expect(String(__lastModalForm()?.titleText).length).toBeLessThan(64);
  });

  it('sends every field bare, since the pack already draws the label', async () => {
    await present(Settings());

    const rows = __lastModalForm()?.rows ?? [];

    expect(rows.map(row => row.kind)).toEqual(['toggle', 'toggle']);
    // Not a serialized control block. That string is the per-field cost an
    // interpreted modal pays on every open, and it is what compiling removes.
    expect(rows.every(row => row.label === '')).toBe(true);
  });

  it('re-keys the positional response by each field name', async () => {
    const seen: Record<string, unknown>[] = [];

    __setModalFormResponses({ canceled: false, formValues: [true, false] });
    await present(Settings(event => { seen.push(event.values); }));

    expect(seen).toEqual([{ sound: true, music: false }]);
  });

  it('gathers a multiple select into the indices that are on, between fields of its own', async () => {
    const seen: Record<string, unknown>[] = [];
    const Picking = (): JSX.Element => Form({
      onSubmit: (event) => { seen.push(event.values); },
      children: [
        lowerField(Toggle, { name: 'sound' }),
        lowerField(Select, {
          name: 'notices',
          multiple: true,
          children: [
            Option({ value: 'join', label: 'Join' }),
            Option({ value: 'leave', label: 'Leave' }),
            Option({ value: 'buy', label: 'Buy' }),
          ],
        }),
        lowerField(Toggle, { name: 'music' }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    });

    __setModalFormResponses({ canceled: false, formValues: [true, true, false, true, false] });
    await present(Picking);

    // One row per option, so the field after the select answers in the slot after its last option.
    expect(__lastModalForm()?.rows.map(row => row.kind)).toEqual(['toggle', 'toggle', 'toggle', 'toggle', 'toggle']);
    expect(seen).toEqual([{ sound: true, notices: [0, 2], music: false }]);
  });

  it('answers an empty array for a multiple select with nothing on', async () => {
    const seen: Record<string, unknown>[] = [];
    const Picking = (): JSX.Element => Form({
      onSubmit: (event) => { seen.push(event.values); },
      children: [
        lowerField(Select, {
          name: 'notices',
          multiple: true,
          children: [Option({ value: 'join', label: 'Join' }), Option({ value: 'leave', label: 'Leave' })],
        }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    });

    __setModalFormResponses({ canceled: false, formValues: [false, false] });
    await present(Picking);

    expect(seen).toEqual([{ notices: [] }]);
  });

  it('refuses a compiled modal with nothing to submit with', async () => {
    // The submit button is drawn by the pack, not by the engine, so a screen
    // that declares none has no way to be submitted at all — better to say so
    // than to show a player a form they cannot close forwards.
    const NoSubmit = (): JSX.Element => Form({
      children: [Panel({ children: lowerField(Toggle, { name: 'sound' }) })],
    });

    await expect(present(NoSubmit)).rejects.toThrow(/Form.Button/);
  });

  it('runs onCancel when the player dismisses', async () => {
    const onCancel = vi.fn();
    const Dismissible = (): JSX.Element => Form({
      onCancel,
      children: [lowerField(Toggle, { name: 'sound' }), Form.Button({ type: 'submit', label: 'Save' })],
    });

    __setModalFormResponses({ canceled: true });
    await present(Dismissible);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('sends one bare row per native field except the slider, in document order', async () => {
    // Every kind the engine draws, so the ordinal a compiled control was baked
    // against is checked against the real thing rather than against toggles
    // alone. `Option` takes no row of its own — the dropdown's writer
    // consumes its children — so four fields are four rows, not seven.
    const Everything = (): JSX.Element => Form({
      children: [
        Text({ children: '§fSETTINGS' }),
        lowerField(Toggle, { name: 'sound', defaultValue: true }),
        lowerField(Slider, { name: 'volume', min: 0, max: 10, defaultValue: 7 }),
        lowerField(Input, { name: 'nick', defaultValue: 'steve' }),
        lowerField(Dropdown, {
          name: 'mode',
          defaultValue: 'normal',
          children: [
            Option({ value: 'easy', label: 'Easy' }),
            Option({ value: 'normal', label: 'Normal' }),
            Option({ value: 'hard', label: 'Hard' }),
          ],
        }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    });

    __setModalFormResponses({ canceled: false, formValues: [true, 7, 'steve', 1] });
    await present(Everything);

    const rows = __lastModalForm()?.rows ?? [];

    expect(rows.map(row => row.kind)).toEqual(['toggle', 'slider', 'textField', 'dropdown']);

    // Bare everywhere the pack already knows the field's look — and NOT on the
    // slider, which the engine's own factory builds from its row and which
    // therefore has to be told the box the build solved for it.
    expect(rows.filter(row => row.kind !== 'slider').every(row => row.label === '')).toBe(true);
    expect(rows.find(row => row.kind === 'slider')?.label).not.toBe('');
  });

  it('sends the options a chooser has, because they are data and not layout', async () => {
    // The one part of a field that still travels. What the list CONTAINS is the
    // author's, and the popup that draws it is the same popup on both paths —
    // its rows decode a blob apiece for their face and their label. The cell
    // payload around them stays bare, which is where the saving is.
    // See `dropdown_popup_card_static`: what a compiled popup does differently
    // is size itself, which is the half that came off the cell.
    const Choosing = (): JSX.Element => Form({
      children: [
        lowerField(Dropdown, {
          name: 'mode',
          defaultValue: 'hard',
          children: [
            Option({ value: 'easy', label: 'Easy' }),
            Option({ value: 'normal', label: 'Normal' }),
            Option({ value: 'hard', label: 'Hard' }),
          ],
        }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    });

    __setModalFormResponses({ canceled: false, formValues: [2] });
    await present(Choosing);

    const [row] = __lastModalForm()?.rows ?? [];

    expect(row?.kind).toBe('dropdown');
    expect(row?.items).toHaveLength(3);

    // Each option is the render pack's own blob, carrying that option's label
    // where `option_label` decodes it from.
    for (const [index, label] of ['Easy', 'Normal', 'Hard'].entries()) {
      expect(row?.items?.[index]).toContain(`s:${label};`);
    }

    // And the CELL is bare: the field's own rect, state and textures are the
    // compiled definition's, not the payload's.
    expect(row?.label).toBe('');
  });
});
