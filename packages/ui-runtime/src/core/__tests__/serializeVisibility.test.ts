import { beforeAll, describe, expect, it } from 'vitest';
import type { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import type { SerializationContext } from '../types';
import { withControl } from '../../components/control';
import { registerNativeComponents } from '../../components';
import { serialize } from '../serializer';

beforeAll(() => {
  // serialize() looks up writers in the registry (panel → label, button → button).
  registerNativeComponents();
});

/** Minimal ActionFormData stub that records which payloads reach each slot. */
class FakeForm {
  readonly buttons: string[] = [];
  readonly labels: string[] = [];

  button(payload: string): this {
    this.buttons.push(payload);

    return this;
  }

  label(payload: string): this {
    this.labels.push(payload);

    return this;
  }
}

function asForm(form: FakeForm): ActionFormData {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test stub; serialize only calls .button/.label
  return form as unknown as ActionFormData;
}

function ctx(): SerializationContext {
  return { buttonCallbacks: new Map(), buttonIndex: 0 };
}

function panel(children: JSX.Node, extra: Record<string, unknown> = {}): JSX.Element {
  return { type: 'panel', props: { ...withControl(extra), children } };
}

function label(value: string, extra: Record<string, unknown> = {}): JSX.Element {
  return { type: 'text', props: { ...withControl(extra), value } };
}

function button(onPress: () => void, extra: Record<string, unknown> = {}): JSX.Element {
  return {
    type: 'button',
    props: {
      ...withControl(extra),
      backgroundHover: '',
      backgroundPressed: '',
      backgroundLocked: '',
      onPress,
    },
  };
}

describe('serialize — static visibility drop', () => {
  it('omits a visible={false} element from the payload', () => {
    const form = new FakeForm();
    const tree = panel([
      label('A'),
      label('B', { visible: false }),
      label('C'),
    ]);

    serialize(tree, asForm(form), ctx());

    // root panel + A + C — B is dropped.
    expect(form.labels).toHaveLength(3);
    expect(form.labels.some(p => p.includes('s:B'))).toBe(false);
    expect(form.labels.some(p => p.includes('s:A'))).toBe(true);
    expect(form.labels.some(p => p.includes('s:C'))).toBe(true);
  });

  it('drops the entire subtree of a hidden parent', () => {
    const form = new FakeForm();
    const tree = panel([
      panel([label('X'), label('Y')], { visible: false }),
      label('Z'),
    ]);

    serialize(tree, asForm(form), ctx());

    // root panel + Z only; the hidden panel and both its children are gone.
    expect(form.labels).toHaveLength(2);
    expect(form.labels.some(p => p.includes('s:X') || p.includes('s:Y'))).toBe(false);
  });

  it('keeps button-index alignment when a hidden button is skipped', () => {
    const form = new FakeForm();
    const context = ctx();

    const onA = (): void => {};

    const onB = (): void => {};

    const onC = (): void => {};

    const tree = panel([
      button(onA),
      button(onB, { visible: false }),
      button(onC),
    ]);

    serialize(tree, asForm(form), context);

    // Only A and C reach the form; the hidden button consumes no index.
    expect(form.buttons).toHaveLength(2);
    expect(context.buttonIndex).toBe(2);
    expect(context.buttonCallbacks.get(0)).toBe(onA);
    expect(context.buttonCallbacks.get(1)).toBe(onC); // not shifted by the dropped B
    expect(context.buttonCallbacks.has(2)).toBe(false);
  });

  it('visible defaults to true — unset elements are still emitted', () => {
    const form = new FakeForm();

    serialize(panel([label('A')]), asForm(form), ctx());

    expect(form.labels).toHaveLength(2); // panel + A
  });
});
