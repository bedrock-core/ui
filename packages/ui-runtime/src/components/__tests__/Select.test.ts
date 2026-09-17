import type { Player } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { registerNativeComponents } from '..';
import { playerOwner } from '../../core/fabric';
import { childElements } from '../../core/guards';
import { buildTree } from '../../core/render/tree';
import type { JSX } from '../../jsx';
import { jsx } from '../../jsx/jsx-runtime';
import { BUTTON_TYPE } from '../Button';
import { Option } from '../Option';
import { Screen } from '../Screen';
import { Select, type SelectProps } from '../Select';

registerNativeComponents();

let built = 0;

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
const player = { id: 'select-press' } as unknown as Player;

/** A fresh owner per build, so no hook state carries from one case to the next. */
const ownerOf = (): ReturnType<typeof playerOwner> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
  playerOwner({ id: `select-press-${String(++built)}` } as unknown as Player);

const OPTIONS = [
  Option({ value: 'join', label: 'Join' }),
  Option({ value: 'leave', label: 'Leave' }),
  Option({ value: 'buy', label: 'Buy' }),
];

/** The buttons a select becomes on a screen of buttons, in option order. */
const buttonsOf = (props: SelectProps & JSX.Props): JSX.Element[] => {
  const tree = buildTree(Screen({ children: jsx(Select, props) }), ownerOf());
  const found: JSX.Element[] = [];

  const visit = (element: JSX.Element): void => {
    if (element.type === BUTTON_TYPE) {
      found.push(element);
    }

    childElements(element.props.children).forEach(visit);
  };

  visit(tree);

  return found;
};

const press = (button: JSX.Element | undefined): void => {
  const { onPress } = button?.props ?? {};

  if (typeof onPress === 'function') {
    onPress({ player });
  }
};

describe('a select where a press reaches script', () => {
  it('calls onChange with the pressed value when it makes one choice', () => {
    const onChange = vi.fn();
    const buttons = buttonsOf({ value: 'join', onChange, children: OPTIONS });

    expect(buttons).toHaveLength(3);

    press(buttons[2]);

    expect(onChange).toHaveBeenCalledWith('buy');
  });

  it('flips only the pressed option when it makes several, keeping option order', () => {
    const onChange = vi.fn();
    const buttons = buttonsOf({ multiple: true, value: ['buy'], onChange, children: OPTIONS });

    press(buttons[0]);
    press(buttons[2]);

    expect(onChange.mock.calls).toEqual([[['join', 'buy']], [[]]]);
  });

  it('draws the chosen options on their selected face', () => {
    const buttons = buttonsOf({
      multiple: true,
      defaultValue: ['join', 'buy'],
      optionBackground: 'mine/off',
      optionSelected: 'mine/on',
      children: OPTIONS,
    });

    expect(buttons.map(button => button.props.background)).toEqual(['mine/on', 'mine/off', 'mine/on']);
  });
});
