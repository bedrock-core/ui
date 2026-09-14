import type { Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  __lastActionForm, __resetFormMocks, __setModalFormResponses,
} from '../../../__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../../components';
import { Button } from '../../../components/Button';
import { Form } from '../../../components/Form';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { titleFor } from '../../../hosts/form/contract';
import type { FunctionComponent, JSX } from '../../../jsx';
import { playerOwner } from '../../fabric';
import { render } from '../lifecycle';
import { present } from '../present';
import { buildTree } from '../tree';
import { compiledTitleOf, registerCompiledScreen } from '../screens';
import { UncompiledScreenError } from '../../types';

beforeAll(() => {
  registerNativeComponents();
});

afterEach(() => {
  __resetFormMocks();
  vi.restoreAllMocks();
});

let seed = 0;

/** A distinct player per case, so one test's session never reaches another's. */
const nextPlayer = (): Player => {
  seed += 1;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub: id + the two inputPermissions methods the input lock uses
  return {
    id: `compiled-${seed}`,
    inputPermissions: {
      isPermissionCategoryEnabled: (): boolean => true,
      setPermissionCategory: vi.fn(),
    },
  } as unknown as Player;
};

/** A fresh component per case: the registry is keyed by identity, so two names for one function are one screen. */
const screenComponent = (): FunctionComponent => (): JSX.Element => Screen({
  children: Panel({
    children: [
      Text({ children: 'BEDROCK CORE' }),
      Button({ onPress: () => undefined, children: Text({ children: 'go' }) }),
    ],
  }),
});

describe('the compiled-screen registry', () => {
  it('knows a screen only once the build has said so', () => {
    const Fresh: FunctionComponent = () => Panel({ children: [] });

    expect(compiledTitleOf(Fresh)).toBeUndefined();

    registerCompiledScreen(Fresh, { key: 'a:b', title: titleFor('a_b') });

    expect(compiledTitleOf(Fresh)).toBe('bcuiv0008core1:a_b');
  });

  it('accepts the same registration twice, which a reload does', () => {
    const Twice: FunctionComponent = () => Panel({ children: [] });

    registerCompiledScreen(Twice, { key: 'a:twice', title: titleFor('a_twice') });

    expect(() => registerCompiledScreen(Twice, { key: 'a:twice', title: titleFor('a_twice') })).not.toThrow();
  });

  it('refuses one component compiled as two screens, rather than letting the last win', () => {
    const Clash: FunctionComponent = () => Panel({ children: [] });

    registerCompiledScreen(Clash, { key: 'a:one', title: titleFor('a_one') });

    expect(() => registerCompiledScreen(Clash, { key: 'a:two', title: titleFor('a_two') })).toThrow(/already registered/);
  });

  it('says nothing about a value that is not a component', () => {
    expect(compiledTitleOf(undefined)).toBeUndefined();
    expect(compiledTitleOf('a string')).toBeUndefined();
  });
});

describe('render, on a screen the build compiled', () => {
  it('shows it by name, and writes only what changes', () => {
    const Compiled = screenComponent();

    registerCompiledScreen(Compiled, { key: 'shop:home', title: titleFor('shop_home') });
    render(Compiled, nextPlayer());

    const form = __lastActionForm();

    // The title picks the layout; the one entry is the button's enabled flag.
    expect(form?.titleText).toBe('bcuiv0008core1:shop_home');
    expect(form?.buttons).toEqual(['t']);
  });

  it('refuses a screen the build never compiled, naming what produces one', () => {
    const Uncompiled = screenComponent();

    expect(() => { render(Uncompiled, nextPlayer()); }).toThrow(UncompiledScreenError);
    expect(__lastActionForm()).toBeUndefined();
  });

  it('leaves a <Form> to the interpreter even when compiled, since a modal is unmeasured', async () => {
    // `present` rather than `render`: a modal that submits asks for another
    // snapshot, and this is about which backend draws it, not the chain.
    const tree = buildTree(
      { type: (): JSX.Element => Form({ onSubmit: () => undefined, children: [Form.Button({ type: 'submit', label: 'Save' })] }), props: {} },
      playerOwner(nextPlayer()),
    );

    __setModalFormResponses({ canceled: true });

    await present(nextPlayer(), tree, titleFor('shop_modal'));

    // A ModalFormData was shown, so the compiled path was not taken.
    expect(__lastActionForm()).toBeUndefined();
  });
});
