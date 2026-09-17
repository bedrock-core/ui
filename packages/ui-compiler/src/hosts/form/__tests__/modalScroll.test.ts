import type { JSX } from '@bedrock-core/ui-runtime';
import { Form, Panel, Scroll, Text, Dropdown, Input, Option, Slider, Toggle } from '@bedrock-core/ui-runtime';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
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
              jsx(Toggle, { name: 'a' }),
              jsx(Slider as unknown as FunctionComponent, { name: 'b', min: 0, max: 10 }),
              jsx(Input as unknown as FunctionComponent, { name: 'c' }),
              jsx(Dropdown as unknown as FunctionComponent, { name: 'd', children: [Option({ value: 'x', label: 'X' }), Option({ value: 'y', label: 'Y' })] }),
              jsx(Toggle, { name: 'e' }),
              jsx(Toggle, { name: 'f' }),
              jsx(Toggle, { name: 'g' }),
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
