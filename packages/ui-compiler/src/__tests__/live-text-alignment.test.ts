import { dynamicText } from '../__fixtures__/dynamicText';
import { Button, Container, Panel, type JSX } from '@bedrock-core/ui-runtime';
import { IDENTITY, TEXT_EMPTY_VALUE } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { child, find, findAll } from '../__fixtures__/helpers';
import { compileScreen } from '../compile';

const compile = (align?: 'left' | 'center' | 'right', hug = false) => compileScreen(() => Container({
  entity: 'align:test', width: 100, height: 60,
  children: Panel({ width: 60, stack: true, children: dynamicText({ width: 60, height: 10, maxLength: 5, textAlign: align, hug, children: '6' }) }),
}), { namespace: 'align', name: 'live' });

describe('whole-value live container text alignment', () => {
  it.each([
    ['left', 'top_left'], ['center', 'top_middle'], ['right', 'top_right'], [undefined, 'top_left'],
  ] as const)('aligns the full run for %s', (align, anchor) => {
    const result = compile(align);
    const text = find(result.document, name => name === 'text_1')[1];
    const run = child(text, 'glyphs');

    expect(text.type).toBe('panel');
    expect(text.size).toEqual([60, 10]);
    expect(run).toMatchObject({ type: 'stack_panel', orientation: 'horizontal', size: ['100%c', '100%c'], anchor_from: anchor, anchor_to: anchor });
    expect(findAll(result.document, name => name.startsWith('glyph@')).map(([, control]) => control.collection_index)).toEqual([1]);
    const glyph = find(result.document, name => name.startsWith('text_channel'))[1];

    expect(glyph.text_alignment).toBe('left');
  });

  it('hides empty text through transport metadata and reads the complete slot string', () => {
    const result = compile('center');
    const glyph = find(result.document, name => name.startsWith('text_channel'))[1];

    expect(glyph.visible).toBe('#visible');
    expect(glyph.bindings).toContainEqual({ binding_type: 'view', source_property_name: `((#channel_identity = ${String(IDENTITY.count)}) and (not (#channel_padding = ${String(TEXT_EMPTY_VALUE)})))`, target_property_name: '#visible' });
    for (const [binding, target] of [['#item_durability_total_amount', '#channel_identity'], ['#item_durability_current_amount', '#channel_padding']]) {
      expect(glyph.bindings).toContainEqual({ binding_type: 'collection', binding_collection_name: 'container_items', binding_name: binding, binding_name_override: target });
    }
    expect(glyph.localize).toBe(false);
    expect(glyph.bindings).toContainEqual({ binding_type: 'collection', binding_collection_name: 'container_items', binding_name: '#hover_text', binding_name_override: '#channel_text' });
  });

  it('keeps hugging text content-sized for parent stack alignment', () => {
    const result = compile('center', true);
    const run = find(result.document, name => name === 'text_1')[1];

    expect(run).toMatchObject({ type: 'stack_panel', size: ['100%c', '100%c'] });
    expect(run.controls).toHaveLength(1);
  });

  it('allocates one string slot without moving the drawn button address', () => {
    const screen = (): JSX.Element => Container({ entity: 'align:test', children: [dynamicText({ width: 60, textAlign: 'center', maxLength: 5, children: '6' }), Button({ width: 20, height: 10 })] });
    const result = compileScreen(screen, { namespace: 'align', name: 'address' });

    expect(result.allocation).toMatchObject({ drawn: 1, channels: 1, size: 3 });
    expect(findAll(result.document, name => name.startsWith('glyph@')).map(([, control]) => control.collection_index)).toEqual([2]);
  });
});
