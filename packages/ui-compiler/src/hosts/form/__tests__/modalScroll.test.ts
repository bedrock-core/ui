import type { JSX } from '@bedrock-core/ui-runtime';
import { Form, Panel, Scroll, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileFormScreen } from '../compile';

/**
 * A modal taller than its canvas scrolls: the fields sit in the scroll's
 * content, placed by their rows like anywhere else, and the dropdown popups
 * still hang at the screen root.
 */
describe('fields inside a scroll on a compiled modal', () => {
  const Tall = (): JSX.Element => Form({
    children: Panel({
      width: 300,
      height: 200,
      padding: 6,
      children: [
        Scroll({
          width: 288,
          height: 160,
          children: Panel({
            gap: 4,
            width: 283,
            children: [
              Text({ children: '§fTALL' }),
              Form.Toggle({ name: 'a' }),
              Form.Slider({ name: 'b', min: 0, max: 10 }),
              Form.Input({ name: 'c' }),
              Form.Dropdown({ name: 'd', children: [Form.Option({ value: 'x', label: 'X' }), Form.Option({ value: 'y', label: 'Y' })] }),
              Form.Toggle({ name: 'e' }),
              Form.Toggle({ name: 'f' }),
              Form.Toggle({ name: 'g' }),
            ],
          }),
        }),
        Form.Button({ type: 'submit', label: 'Save' }),
      ],
    }),
  });

  it('compiles, with every field placed by its row', () => {
    const compiled = compileFormScreen(Tall, { namespace: 'a', name: 'tall' });
    const json = JSON.stringify(compiled.document);

    expect(json).toContain('core_ui_shapes.scroll');
    expect(json).toContain('"collection_index":0');
    expect(json).toContain('"collection_index":6');
  });
});
