import type { JSX } from '@bedrock-core/ui-runtime';
import { Button, Panel, Slot, Text, useState } from '@bedrock-core/ui-runtime';
import { FORM_COLLECTION } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import type { Control } from '../../../jsonui';
import { definition, find } from '../../../__fixtures__/helpers';
import { compileFormScreen } from '../compile';

/**
 * Every part of a form a compiled screen has to place: static decoration that
 * costs nothing, a press, and a string that changes.
 */
const Home = (): JSX.Element => Panel({
  padding: 6,
  gap: 4,
  children: [
    Text({ children: '§fBEDROCK CORE' }),
    Text({ maxLength: 12, children: 'idle' }),
    Panel({
      flexDirection: 'row',
      gap: 4,
      children: [
        Button({ onPress: () => undefined, children: Text({ children: 'go' }) }),
        Button({ onPress: () => undefined, children: Text({ children: 'stop' }) }),
      ],
    }),
  ],
});

describe('compiling a form screen', () => {
  const compiled = compileFormScreen(Home, { namespace: 'drav0011_shop', name: 'home' });

  it('names the screen and the title it will be shown with', () => {
    expect(compiled).toMatchObject({
      name: 'home',
      addon: 'drav0011_shop',
      namespace: 'drav0011_shop_home',
      title: 'bcuiv0008core1:drav0011_shop_home',
      hasBackdrop: false,
    });
  });

  it('spends an entry on each press and on the live text, and nothing on the static one', () => {
    // Two presses first, in document order, then the channel — so a selection
    // index does not move when the screen gains or loses text.
    expect(compiled.entries.map(entry => [entry.entry, entry.role, entry.length])).toEqual([
      [0, 'button', undefined],
      [1, 'button', undefined],
      [2, undefined, 12],
    ]);
  });

  it('bakes the static label into the document, where it costs nothing at runtime', () => {
    const [, title] = find(compiled.document, name => name === 'label_1');

    expect(title).toMatchObject({ type: 'label', text: '§fBEDROCK CORE', localize: false });
  });

  it('gives each button its own entry index, which is the selection it comes back as', () => {
    const indices: unknown[] = [];

    const walk = (control: Control): void => {
      if (control.collection_index !== undefined) {
        indices.push(control.collection_index);
      }

      for (const entry of control.controls ?? []) {
        for (const child of Object.values(entry)) {
          walk(child);
        }
      }
    };

    walk(definition(compiled.document, 'screen'));

    // Two presses and one live text, each reading its own entry.
    expect(indices.sort()).toEqual([0, 1, 2]);
  });

  it('reads every entry through the form collection, never a container one', () => {
    const json = JSON.stringify(compiled.document);

    expect(json).toContain(FORM_COLLECTION);
    expect(json).not.toContain('container_items');
  });

  it('refuses a screen that renders more than one root, having no canvas to measure from', () => {
    const Two = (): JSX.Element => ({
      type: 'fragment',
      props: { children: [Panel({ children: [] }), Panel({ children: [] })] },
    });

    expect(() => compileFormScreen(Two, { namespace: 'a', name: 'two' })).toThrow(/exactly one element at its root/);
  });

  it('refuses a container control, because a form has no container behind it', () => {
    const WithSlot = (): JSX.Element => Panel({ children: [Slot({})] });

    expect(() => compileFormScreen(WithSlot, { namespace: 'a', name: 'slotty' }))
      .toThrow(/only exists in a container screen/);
  });

  it('refuses baked text a state change would move, the same as a container screen', () => {
    const Stateful = (): JSX.Element => {
      const [label] = useState('start');

      return Panel({ children: [Text({ children: label })] });
    };

    expect(() => compileFormScreen(Stateful, { namespace: 'a', name: 'frozen' })).toThrow(/maxLength/);
  });
});
