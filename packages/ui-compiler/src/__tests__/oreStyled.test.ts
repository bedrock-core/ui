import type { JSX } from '@bedrock-core/ui-runtime';
import { Container, Form, Panel, Screen as ScreenRoot, Text } from '@bedrock-core/ui-runtime';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { describe, expect, it } from 'vitest';
import { Button } from '../../../ore-styled/src/Button';
import { Card } from '../../../ore-styled/src/Card';
import { MenuRow } from '../../../ore-styled/src/MenuRow';
import { Input } from '../../../ore-styled/src/Input';
import { Slider } from '../../../ore-styled/src/Slider';
import { FormButton } from '../../../ore-styled/src/Form/FormButton';
import { theme } from '../../../ore-styled/src/tokens';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';
import { child, definition, drawnFace, eachControl, find } from '../__fixtures__/helpers';

/** A styled screen: the components an addon actually writes with. */
const Screen = (): JSX.Element => Container({
  entity: 'core:ore',
  children: [
    Card({
      children: [
        Text({ children: 'Title' }),
        Button({ onPress: () => undefined, children: 'Go' }),
        Button({ variant: 'danger', enabled: false, children: 'Stop' }),
      ],
    }),
  ],
});

describe('ore-styled components in a container screen', () => {
  it('compile without throwing', () => {
    expect(() => compileScreen(Screen, { name: 'ore' })).not.toThrow();
  });

  it('draw the theme\'s textures and captions', () => {
    const { document, faces, allocation } = compileScreen(Screen, { name: 'ore' });
    const primary = theme.components.button.variants.primary;
    const danger = theme.components.button.variants.danger;

    expect(allocation).toMatchObject({ drawn: 2, channels: 0 });

    // Two looks, so two face families and two mechanisms, in document order.
    // The resting face is the button's `default` state, gated inside.
    const [go, stop] = ['press_1', 'press_2'].map((mechanism) => {
      const [rest] = definition(document, `${mechanism}_states@core_ui_chest.slot_button`).controls ?? [];
      const [face] = rest?.['default']?.controls?.[0]?.['gate']?.controls ?? [];

      return Object.keys(face ?? {})[0]?.replace('face@core_ui_faces.', '') ?? '';
    });

    expect(child(drawnFace(faces, go ?? ''), 'bg').texture).toBe(primary.textures.default);
    expect(child(drawnFace(faces, `${go}_disabled`), 'bg').texture).toBe(primary.textures.disabled);
    expect(child(faces[`${go}_content`] ?? {}, 'c0').text).toBe(`${primary.textStyle.color}Go`);

    expect(child(drawnFace(faces, stop ?? ''), 'bg').texture).toBe(danger.textures.default);
    expect(child(faces[`${stop}_content`] ?? {}, 'c0').text).toBe(`${danger.textStyle.disabledColor}Stop`);

    const [, card] = find(document, name => name === 'panel_1');

    expect(child(card, 'bg').texture).toBe(theme.components.card.variants.raised.textures.background);
  });
});

describe('a menu row with a live line', () => {
  // A button's children are baked into its face, so a live title cannot be one of them.
  const Rows = (): JSX.Element => ScreenRoot({
    children: Panel({
      width: 200,
      children: [
        MenuRow({ title: 'live title', titleMaxLength: 16, onPress: () => undefined }),
        MenuRow({ title: 'live subtitle', subtitle: 'sub', subtitleMaxLength: 12, to: 'a:elsewhere' }),
        MenuRow({ title: 'baked' }),
      ],
    }),
  });

  it('compiles, with the line drawn above the press rather than inside it', () => {
    const { snapshot } = compileFormScreen(Rows, { namespace: 'a', name: 'rows' });

    // Every row still takes a press, and the two live lines ride entries of their own.
    expect(snapshot.shape.startsWith('button,button,button | text:16,text:12 |')).toBe(true);
  });
});

describe('styled native input text offsets', () => {
  for (const label of [undefined, 'Label']) {
    for (const offset of [undefined, -1, 0, 1]) {
      it(`keeps ${String(offset)} offsets with ${label ?? 'no label'}`, () => {
        const NativeField = (): JSX.Element => Input({ name: 'value', label, width: 160, defaultValue: 'A', placeholder: 'B',
          textOffsetX: offset, textOffsetY: offset, placeholderOffsetX: offset, placeholderOffsetY: offset });
        const Submit = (): JSX.Element => Form.Button({ type: 'submit', label: 'Submit' });
        const Field = (): JSX.Element => Form({ children: Panel({ width: 200, height: 200, children: [
          jsx(NativeField, {}),
          jsx(Submit, {}),
        ] }) });
        const result = compileFormScreen(Field, { namespace: 'a', name: 'input_offsets' });
        const observed: { value: unknown; placeholder: unknown }[] = [];

        eachControl(result.document, (_name, control) => {
          if ('$value_offset' in control) {
            observed.push({ value: control.$value_offset, placeholder: control.$placeholder_offset });
          }
        });

        const expected = offset === undefined ? [8, -5] : [offset, offset];

        expect(observed).toEqual([{ value: expected, placeholder: expected }]);
      });
    }
  }
});

describe('native field aspect ratios', () => {
  for (const kind of ['input', 'slider', 'button'] as const) {
    const defaultHeight = kind === 'slider' ? 32 : 24;

    for (const [aspectRatio, height, expected] of [[undefined, undefined, defaultHeight], [0.5, undefined, 96], [2, undefined, 24],
      [0.5, 24, 24], [0, undefined, defaultHeight], [-1, undefined, defaultHeight]] as const) {
      it(`${kind} preserves height ${String(height)} with aspect ratio ${String(aspectRatio)}`, () => {
        const Subject = (): JSX.Element => {
          const layout = { width: 48, aspectRatio, height };

          if (kind === 'input') { return Input({ name: 'value', ...layout }); }

          if (kind === 'slider') { return Slider({ name: 'value', min: 0, max: 10, ...layout }); }

          return FormButton({ type: 'submit', ...layout });
        };
        const Submit = (): JSX.Element => Form.Button({ type: 'submit', label: 'Submit' });
        const Field = (): JSX.Element => Form({ children: Panel({ width: 200, height: 200, children: [
          jsx(Subject, {}), ...kind === 'button' ? [] : [jsx(Submit, {})],
        ] }) });
        const compiled = compileFormScreen(Field, { namespace: 'a', name: 'field_ratio' });

        expect(compiled.face.root.children[0]?.rect).toMatchObject({ width: 48, height: expected });
      });
    }
  }
});
