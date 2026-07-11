import { beforeAll, describe, expect, it } from 'vitest';
import type { ActionFormData } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import type { ActionSerializationContext } from '../types';
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

function ctx(): ActionSerializationContext {
  return { mode: 'action', buttonCallbacks: new Map(), buttonIndex: 0 };
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

    // A + C — B is dropped (the background-less root panel emits nothing either).
    expect(form.labels).toHaveLength(2);
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

    // Z only; the hidden panel and both its children are gone.
    expect(form.labels).toHaveLength(1);
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

    expect(form.labels).toHaveLength(1); // A (background-less panel skipped)
  });
});

describe('serialize — cell-count optimizations', () => {
  it('skips a background-less panel cell but keeps its children', () => {
    const form = new FakeForm();

    serialize(panel([label('A'), label('B')]), asForm(form), ctx());

    expect(form.labels).toHaveLength(2);
    expect(form.labels.some(p => p.includes('s:panel'))).toBe(false);
  });

  it('still emits a panel that has a background', () => {
    const form = new FakeForm();

    serialize(
      panel([label('A'), label('B')], { background: 'textures/ui/wool' }),
      asForm(form),
      ctx(),
    );

    expect(form.labels).toHaveLength(3);
    expect(form.labels.some(p => p.includes('s:panel'))).toBe(true);
    expect(form.labels.some(p => p.includes('s:textures/ui/wool'))).toBe(true);
  });

  it('folds panel(background) + single text child into one text cell', () => {
    const form = new FakeForm();
    const child = label('A');

    // Simulate layout output: panel at (100, 200) 240×32, text at (117, 223)
    // with its own label nudge (1, 2). (Set directly on props — withControl only
    // passes through known control/layout keys, and labelX/labelY are Text's.)
    child.props.jsonUIx = 117;
    child.props.jsonUIy = 223;
    child.props.labelX = 1;
    child.props.labelY = 2;

    const tree = panel([child], { background: 'textures/ui/wool' });

    tree.props.jsonUIx = 100;
    tree.props.jsonUIy = 200;
    tree.props.jsonUIWidth = 240;
    tree.props.jsonUIHeight = 32;

    serialize(tree, asForm(form), ctx());

    // ONE cell: the text, carrying the panel's geometry + background, with the
    // child's in-panel position absorbed into the label offset (17+1, 23+2).
    expect(form.labels).toHaveLength(1);
    const [merged] = form.labels;

    expect(merged.includes('s:text')).toBe(true);
    expect(merged.includes('s:textures/ui/wool')).toBe(true);
    expect(merged.includes('n:240;')).toBe(true); // panel width
    expect(merged.includes('n:18;')).toBe(true); // labelX 1 + (117-100)
    expect(merged.includes('n:25;')).toBe(true); // labelY 2 + (223-200)
  });

  it('does not fold when the text child carries its own background', () => {
    const form = new FakeForm();
    const child = label('A', { background: 'textures/ui/stone' });
    const tree = panel([child], { background: 'textures/ui/wool' });

    serialize(tree, asForm(form), ctx());

    expect(form.labels).toHaveLength(2); // panel + text stay separate
  });

  it('does not fold multi-child panels', () => {
    const form = new FakeForm();
    const tree = panel([label('A'), label('B')], { background: 'textures/ui/wool' });

    serialize(tree, asForm(form), ctx());

    expect(form.labels).toHaveLength(3);
  });

  it('does not fold wrap-text children', () => {
    const form = new FakeForm();
    const child: ReturnType<typeof label> = {
      type: 'text_wrap',
      props: { ...withControl({}), value: 'key.a' },
    };
    const tree = panel([child], { background: 'textures/ui/wool' });

    serialize(tree, asForm(form), ctx());

    expect(form.labels).toHaveLength(2);
  });
});
