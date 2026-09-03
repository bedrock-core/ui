import { Button, Container, Panel, Scroll, Slot, Text } from '@bedrock-core/ui-runtime';
import type { JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { definition, find } from '../__fixtures__/helpers';
import { compileScreen } from '../compile';
import type { Control } from '../jsonui';

/** Twelve rows in a 60-texel viewport: far more content than fits. */
const Screen = (): JSX.Element => Container({
  entity: 'core:test',
  children: [
    Text({ children: 'above' }),
    Scroll({
      height: 60,
      children: Array.from({ length: 12 }, (_unused, row) => Panel({
        flexDirection: 'row',
        gap: 4,
        children: [
          Text({ children: `row ${row}` }),
          Slot({}),
          Button({ onPress: () => undefined, children: Text({ children: 'go' }) }),
        ],
      })),
    }),
    Text({ maxLength: 4, children: 'live' }),
  ],
});

const compile = (): ReturnType<typeof compileScreen> => compileScreen(Screen, { name: 'list' });

describe('a scroll region', () => {
  it('keeps every cell inside it in the allocation, in document order', () => {
    const { allocation } = compile();

    // Twelve slots and twelve buttons, then the one live text after the scroll.
    expect(allocation.drawn).toBe(24);
    expect(allocation.channels).toBe(4);
  });

  it('mounts vanilla\'s scrolling panel over content laid out at its own height', () => {
    const { document } = compile();
    const [name, panel] = find(document, control => control.endsWith('@core_ui_shapes.scroll'));
    const content = definition(document, 'scroll_1_content');
    const rows: Control[] = (content.controls ?? []).map(entry => Object.values(entry)[0]);

    expect(name).toBe('scroll_1@core_ui_shapes.scroll');
    expect(panel.size).toEqual([320, 60]);
    expect(panel.$scrolling_content).toBe('core_ui_list.scroll_1_content');

    // The content is as tall as its last row reaches, well past the viewport,
    // and as wide as the viewport less the 5-texel scrollbar track.
    expect(content.size?.[0]).toBe(315);
    expect(content.size?.[1]).toBeGreaterThan(60);
    expect(rows).toHaveLength(12);

    // Rows are positioned from the content's own origin, not the screen's.
    expect(rows[0]?.offset).toEqual([0, 0]);
    expect(rows[11]?.offset?.[1]).toBeGreaterThan(60);
  });

  it('refuses a scroll inside a scroll', () => {
    const Nested = (): JSX.Element => Container({
      entity: 'core:test',
      children: [Scroll({ height: 40, children: [Scroll({ children: [Text({ children: 'x' })] })] })],
    });

    expect(() => compileScreen(Nested, { name: 'nested' })).toThrow(/inside another/);
  });
});
