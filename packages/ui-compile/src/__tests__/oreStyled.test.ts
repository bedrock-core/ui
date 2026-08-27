import type { JSX } from '@bedrock-core/ui-runtime';
import { Container, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { Button } from '../../../ore-styled/src/Button';
import { Card } from '../../../ore-styled/src/Card';
import { theme } from '../../../ore-styled/src/tokens';
import { compileScreen } from '../compile';
import { child, definition, find } from '../__fixtures__/helpers';

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
    const { document, allocation } = compileScreen(Screen, { name: 'ore' });
    const primary = theme.components.button.variants.primary;
    const danger = theme.components.button.variants.danger;

    expect(allocation).toMatchObject({ drawn: 2, channels: 0 });

    const go = definition(document, 'button_1_face');

    expect(child(go, 'bg').texture).toBe(primary.textures.default);
    expect(child(go, 'bg_disabled').texture).toBe(primary.textures.disabled);
    expect(child(child(go, 'content'), 'label_2').text).toBe(`${primary.textStyle.color}Go`);

    const stop = definition(document, 'button_2_face');

    expect(child(stop, 'bg').texture).toBe(danger.textures.default);
    expect(child(child(stop, 'content'), 'label_3').text).toBe(`${danger.textStyle.disabledColor}Stop`);

    const [, card] = find(document, name => name === 'panel_1');

    expect(child(card, 'bg').texture).toBe(theme.components.card.variants.raised.textures.background);
  });
});
