import type { JSX } from '@bedrock-core/ui-runtime';
import { Container, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { Button } from '../../../ore-styled/src/Button';
import { Card } from '../../../ore-styled/src/Card';
import { theme } from '../../../ore-styled/src/tokens';
import { compileScreen } from '../compile';
import { child, definition, drawnFace, find } from '../__fixtures__/helpers';

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
    const [go, stop] = ['press_1', 'press_2'].map((mechanism) => {
      const [enabled] = definition(document, mechanism).controls ?? [];

      return String(enabled?.['enabled']?.controls?.[0]?.['item@core_ui_chest.cell']?.$background_images).replace('core_ui_faces.', '');
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
