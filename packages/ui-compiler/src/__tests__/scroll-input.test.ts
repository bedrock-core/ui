import { Container, Dropdown, Form, Option, Panel, Screen, Scroll, Text } from '@bedrock-core/ui-runtime';
import type { JSX } from '@bedrock-core/ui-runtime';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';
import { buildUiPack } from '../pack';

const content = (): JSX.Element => Scroll({
  width: 200, height: 80,
  children: Panel({ width: 180, height: 200, children: Text({ children: 'Scrollable content' }) }),
});

const form = (): JSX.Element => Screen({ children: Panel({ width: 220, height: 100, children: content() }) });
const container = (): JSX.Element => Container({ entity: 'core:test', children: content() });
const dropdown = (): JSX.Element => Form({ children: Panel({ width: 200, height: 180, children: [
  jsx((): JSX.Element => Dropdown({
    name: 'choice', children: Array.from({ length: 20 }, (_, index) => Option({ value: String(index), label: `Option ${index}` })),
  }), {}),
  Form.Button({ type: 'submit', label: 'Save' }),
] }) });

describe('compiled native scroll input', () => {
  it.each([
    { host: 'form', source: (): ReturnType<typeof compileFormScreen> => compileFormScreen(form, { namespace: 'alpha', name: 'form' }) },
    { host: 'container', source: (): ReturnType<typeof compileScreen> => compileScreen(container, { namespace: 'alpha', name: 'container' }) },
    { host: 'dropdown popup', source: (): ReturnType<typeof compileFormScreen> => compileFormScreen(dropdown, { namespace: 'alpha', name: 'dropdown' }) },
  ])('keeps content gestures and scrollbar mappings in the linked $host pack', ({ source }) => {
    const pack = buildUiPack([source()], 'alpha');
    const scrolls: Record<string, unknown>[] = [];

    const visit = (value: unknown): void => {
      if (value === null || typeof value !== 'object') { return; }

      if ('type' in value && value.type === 'scroll_view') { scrolls.push({ ...value }); }

      Object.values(value).forEach(visit);
    };

    pack.documents.forEach(document => visit(document.document));

    expect(scrolls).not.toHaveLength(0);

    for (const scroll of scrolls) {
      // Vanilla selects touch scrolling with $touch and reads the gesture setting.
      // A working thumb alone does not establish that content drags are enabled.
      expect(scroll).toMatchObject({
        touch_mode: '$touch',
        scrollbar_touch_button: 'button.scrollbar_touch',
        scrollbar_track_button: 'button.scrollbar_skip_track',
        scroll_content: 'scrolling_content',
        scroll_view_port: 'scrolling_view_port',
      });
      expect(scroll.bindings).toContainEqual({ binding_name: '#gesture_control_enabled' });
      expect(scroll.button_mappings).toContainEqual({
        from_button_id: 'button.menu_select', to_button_id: 'button.scrollbar_touch',
        mapping_type: 'pressed', button_up_right_of_first_refusal: true,
      });
    }
  });
});
