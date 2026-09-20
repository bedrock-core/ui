import type { Player } from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { registerNativeComponents } from '../../components';
import { Container } from '../../components/Container';
import { Expect } from '../../components/Expect';
import { Form } from '../../components/Form';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { BUILD_OWNER, playerOwner } from '../../core/fabric';
import { buildTree } from '../../core/render/tree';
import { ScreenRootError } from '../../core/types';
import { useMechanism } from '../../hooks';
import type { JSX } from '../../jsx';
import { CHEST, type ComponentKind, FORM_ACTION, FORM_MODAL, type Mechanism } from '..';

registerNativeComponents();

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
const player = { id: 'mechanisms' } as unknown as Player;

const show = (screen: () => JSX.Element): JSX.Element => buildTree({ type: screen, props: {} }, playerOwner(player));

/** A component that reports what the surrounding screen makes of `kind`. */
const asks = (kind: ComponentKind, into: { seen?: Mechanism }) => (): JSX.Element => {
  into.seen = useMechanism(kind);

  return Text({ children: 'x' });
};

describe('what each host makes of a component', () => {
  it('gives the modal the engine typed fields and no generic button', () => {
    expect(FORM_MODAL.mechanisms.Toggle).toBe('field');
    expect(FORM_MODAL.mechanisms.Slider).toBe('field');
    expect(FORM_MODAL.mechanisms.Dropdown).toBe('field');
    expect(FORM_MODAL.mechanisms.Input).toBe('field');
    expect(FORM_MODAL.mechanisms.Select).toBe('field');
    expect(FORM_MODAL.mechanisms.Button).toBeUndefined();
  });

  it('gives the action form presses and no typed field', () => {
    expect(FORM_ACTION.mechanisms.Button).toBe('press');
    expect(FORM_ACTION.mechanisms.Toggle).toBe('press');
    expect(FORM_ACTION.mechanisms.Select).toBe('press');
    expect(FORM_ACTION.mechanisms.Slider).toBeUndefined();
    expect(FORM_ACTION.mechanisms.Dropdown).toBeUndefined();
    expect(FORM_ACTION.mechanisms.Input).toBeUndefined();
  });

  it('gives the chest cells of its own container, which is the only host that has any', () => {
    expect(CHEST.mechanisms.Button).toBe('slot');
    expect(CHEST.mechanisms.Slot).toBe('slot');
    expect(CHEST.mechanisms.SlotGrid).toBe('collection');
    expect(CHEST.mechanisms.Input).toBeUndefined();
    expect(FORM_ACTION.mechanisms.Slot).toBeUndefined();
    expect(FORM_MODAL.mechanisms.Slot).toBeUndefined();
  });
});

describe('a component asking what it becomes', () => {
  it('is told by the root above it, so one component serves every screen', () => {
    const onModal: { seen?: Mechanism } = {};
    const onAction: { seen?: Mechanism } = {};
    const onChest: { seen?: Mechanism } = {};

    show((): JSX.Element => Form({ children: [{ type: asks('Toggle', onModal), props: {} }] }));
    show((): JSX.Element => Screen({ children: { type: asks('Toggle', onAction), props: {} } }));
    buildTree(
      Container({ entity: 'core:test', children: [{ type: asks('Toggle', onChest), props: {} }] }),
      BUILD_OWNER,
    );

    expect(onModal.seen).toBe('field');
    expect(onAction.seen).toBe('press');
    expect(onChest.seen).toBe('slot');
  });

  it('is refused in the host\'s own words when the screen cannot draw it', () => {
    const asked: { seen?: Mechanism } = {};
    const screen = (): JSX.Element => Screen({ children: { type: asks('Slider', asked), props: {} } });

    expect(() => show(screen)).toThrow(/`Slider` must be rendered inside a `<Form>`/);
  });

  it('says so when nothing above it names a screen at all', () => {
    const asked: { seen?: Mechanism } = {};

    expect(() => show(asks('Toggle', asked))).toThrow(ScreenRootError);
    expect(() => show(asks('Toggle', asked))).toThrow(/no screen at all/);
  });
});

describe('a fragment written for one host', () => {
  it('draws where it says it belongs', () => {
    const screen = (): JSX.Element => Form({
      children: [Expect({ host: 'form-modal', children: [Text({ children: 'fields' })] })],
    });

    expect(() => show(screen)).not.toThrow();
  });

  it('names the screen it wanted and the one it got', () => {
    const screen = (): JSX.Element => Screen({
      children: Panel({ children: [Expect({ host: 'form-modal', children: [Text({ children: 'fields' })] })] }),
    });

    expect(() => show(screen)).toThrow(ScreenRootError);
    expect(() => show(screen)).toThrow(/written for a form-modal and is being drawn on a form-action/);
  });
});
