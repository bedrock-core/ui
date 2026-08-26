import type { Player } from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Form } from '../../../components/Form';
import { Image } from '../../../components/Image';
import { Panel } from '../../../components/Panel';
import { Scroll } from '../../../components/Scroll';
import { Slot } from '../../../components/Slot';
import { SlotGrid } from '../../../components/SlotGrid';
import { Text } from '../../../components/Text';
import { buildContainerTree } from '../../../container/build';
import type { JSX } from '../../../jsx';
import { playerOwner } from '../../fabric';
import { ContainerScreenError } from '../../types';
import { buildTree } from '../tree';

const player = { id: 'validate-container' } as unknown as Player;

const screen = (...children: JSX.Element[]): (() => JSX.Element) =>
  () => Container({ entity: 'core:test', children });

describe('the form path', () => {
  it('rejects a <Container>, pointing at createContainerScreen', () => {
    const tree = Container({ entity: 'core:test', children: [] });

    expect(() => buildTree(tree, playerOwner(player))).toThrow(ContainerScreenError);
    expect(() => buildTree(tree, playerOwner(player))).toThrow(/createContainerScreen/);
  });

  it('rejects a Slot outside a container', () => {
    const tree = Panel({ children: [Slot({})] });

    expect(() => buildTree(tree, playerOwner(player))).toThrow(/only exists in a container screen/);
  });

});

describe('the container path', () => {
  it('accepts the components a container screen is made of', () => {
    const Screen = screen(
      Text({ children: 'static' }),
      Text({ maxLength: 4, children: 'live' }),
      Image({}),
      Button({ children: Text({ children: '+' }) }),
      Slot({ role: 'input' }),
    );

    expect(() => buildContainerTree(Screen)).not.toThrow();
  });

  it('requires exactly one <Container> at the root', () => {
    const Screen = (): JSX.Element => Panel({ children: [Slot({})] });

    expect(() => buildContainerTree(Screen)).toThrow(ContainerScreenError);
    expect(() => buildContainerTree(Screen)).toThrow(/exactly one/);
  });

  it('requires the container to name its entity', () => {
    const Screen = (): JSX.Element => Container({ entity: '', children: [] });

    expect(() => buildContainerTree(Screen)).toThrow(/needs `entity`/);
  });

  it('rejects a nested <Container>', () => {
    const Screen = screen(Container({ entity: 'core:inner', children: [] }));

    expect(() => buildContainerTree(Screen)).toThrow(/nested/);
  });

  it('accepts a <Scroll>, and refuses one inside another', () => {
    const Flat = screen(Scroll({ height: 40, children: [Text({ children: 'x' })] }));
    const Nested = screen(Scroll({ height: 40, children: [Scroll({ children: [Text({ children: 'x' })] })] }));

    expect(() => buildContainerTree(Flat)).not.toThrow();
    expect(() => buildContainerTree(Nested)).toThrow(/inside another `<Scroll>`/);
  });

  it('rejects a <Form>: a container has no native form', () => {
    const Screen = screen(Form({ children: [Form.Toggle({ name: 't' })] }));

    expect(() => buildContainerTree(Screen)).toThrow(/cannot be used in a container screen/);
  });

  it('rejects content that does not fit the canvas', () => {
    const Screen = screen(Panel({ height: 400 }));

    expect(() => buildContainerTree(Screen)).toThrow(/canvas is fixed/);
  });

  it('rejects live text inside a Button for now', () => {
    const Screen = screen(Button({ children: Text({ maxLength: 3, children: 'x' }) }));

    expect(() => buildContainerTree(Screen)).toThrow(/inside a `<Button>`/);
  });

  it('accepts a <SlotGrid> and a foreign <Slot collection>', () => {
    const Screen = screen(
      SlotGrid({ collection: 'inventory_items', columns: 9, rows: 1 }),
      Slot({ collection: 'hotbar_items', index: 0 }),
    );

    expect(() => buildContainerTree(Screen)).not.toThrow();
  });

  it('rejects a <SlotGrid> inside a Button: a button bakes a static face', () => {
    const Screen = screen(Button({ children: SlotGrid({ collection: 'inventory_items', columns: 9, rows: 1 }) }));

    expect(() => buildContainerTree(Screen)).toThrow(/cannot sit inside a `<Button>`/);
  });

  it('rejects a foreign <Slot collection> inside a Button', () => {
    const Screen = screen(Button({ children: Slot({ collection: 'hotbar_items', index: 0 }) }));

    expect(() => buildContainerTree(Screen)).toThrow(/cannot sit inside a `<Button>`/);
  });
});
