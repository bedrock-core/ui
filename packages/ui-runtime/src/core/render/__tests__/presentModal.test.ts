import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import { __resetModalFormMock, __setModalFormResponses } from '../../../__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../../components';
import { Toggle } from '../../../components/Toggle';
import { Slider } from '../../../components/Slider';
import { Dropdown } from '../../../components/Dropdown';
import { Input } from '../../../components/Input';
import { Form, MODAL_FORM_SLOT_TYPE, type FormConfig } from '../../../components/Form';
import { Option } from '../../../components';
import type { JSX } from '../../../jsx';
import { titleFor } from '../../../hosts/form/contract';
import { present } from '../present';
import { lowerField } from '../../../__fixtures__/lowerField';

beforeAll(() => {
  registerNativeComponents();
});

afterEach(() => {
  __resetModalFormMock();
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub; only id is used
const player = { id: 'modal-presenter' } as unknown as Player;

/**
 * Build the marker tree the presenter sees after buildTree, with the given config +
 * controls. A submit `Form.Button` is appended — a modal requires exactly one.
 */
function modalTree(config: FormConfig, children: JSX.Element[]): JSX.Element {
  return {
    type: MODAL_FORM_SLOT_TYPE,
    props: {
      __formConfig: config,
      children: [...children, Form.Button({ type: 'submit', label: 'Save' })],
    },
  };
}

describe('a modal present', () => {
  it('re-keys formValues by control name and passes them to onSubmit', async () => {
    const onSubmit = vi.fn();
    const tree = modalTree({ onSubmit }, [
      lowerField(Toggle, { name: 'sound', defaultValue: false }),
      lowerField(Slider, { name: 'volume', min: 0, max: 10 }),
      lowerField(Dropdown, { name: 'mode', children: [Option({ value: 'A', label: 'A' }), Option({ value: 'B', label: 'B' })] }),
      lowerField(Input, { name: 'nick' }),
    ]);

    __setModalFormResponses({ canceled: false, formValues: [true, 7, 1, 'Steve'] });

    await present(player, tree, titleFor('modal_case'));

    expect(onSubmit).toHaveBeenCalledWith({ player, values: { sound: true, volume: 7, mode: 1, nick: 'Steve' } });
  });

  it('calls onCancel when the player dismisses', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const tree = modalTree({ onSubmit, onCancel }, [lowerField(Toggle, { name: 'x' })]);

    __setModalFormResponses({ canceled: true });

    await present(player, tree, titleFor('modal_case'));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('skips unnamed controls and out-of-range values', async () => {
    const onSubmit = vi.fn();
    const tree = modalTree({ onSubmit }, [
      lowerField(Toggle, { name: 'a' }),
      lowerField(Toggle, { name: 'b' }),
    ]);

    // Only one value returned for two controls.
    __setModalFormResponses({ canceled: false, formValues: [true] });

    await present(player, tree, titleFor('modal_case'));

    expect(onSubmit).toHaveBeenCalledWith({ player, values: { a: true, b: undefined } });
  });
});
