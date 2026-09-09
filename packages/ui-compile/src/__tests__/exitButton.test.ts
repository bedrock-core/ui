import { Button, Container, Text, useExit } from '@bedrock-core/ui-runtime';
import type { JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../__fixtures__/helpers';
import { compileScreen } from '../compile';
import type { Control } from '../jsonui';

/** One close button beside one ordinary button. */
const Screen = (): JSX.Element => {
  const exit = useExit();

  return Container({
    entity: 'core:test',
    children: [
      Button({ onPress: exit, children: Text({ children: 'x' }) }),
      Button({ onPress: () => undefined, children: Text({ children: 'go' }) }),
    ],
  });
};

const isExit = (control: Control): boolean =>
  control.button_mappings?.some(mapping => mapping.to_button_id === 'button.menu_exit') ?? false;

describe('a close button', () => {
  it('takes no container slot', () => {
    const { allocation } = compileScreen(Screen, { name: 'closable' });

    expect(allocation.drawn).toBe(1);
  });

  it('is a real button routed to the engine exit, drawn with the author\'s faces', () => {
    const { document, faces } = compileScreen(Screen, { name: 'closable' });
    const exits: Control[] = [];

    eachControl(document, (_name, control) => {
      if (isExit(control)) {
        exits.push(control);
      }
    });

    expect(exits).toHaveLength(1);

    const [exit] = exits;

    expect(exit.type).toBe('button');
    expect(exit.$slot).toBeUndefined();
    expect(exit.collection_index).toBeUndefined();

    // Every state IS one of the shared faces, the caption inside each. A
    // button draws the child its `*_control` names and nothing else, so a
    // caption beside the states would never be seen — and a close button with
    // a label is exactly where that goes unnoticed.
    const states = (exit.controls ?? []).map(entry => Object.keys(entry)[0] ?? '');

    expect(states.map(state => state.split('@')[0])).toEqual(['default', 'hover', 'pressed']);

    for (const state of states) {
      const face = faces[state.split('.')[1] ?? ''];

      expect(JSON.stringify(face)).toContain('textures/ui/unstyled');
      expect(face?.controls?.map(child => Object.keys(child)[0])?.[1]).toMatch(/^caption@/);
    }

    expect(JSON.stringify(faces)).toContain('"text":"x"');
    expect(JSON.stringify(document)).not.toContain('"text":"x"');
  });
});
