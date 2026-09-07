/** @jsxImportSource @bedrock-core/ui-runtime */
import { analyze, buildScreenTree, probeLiveness, shapeOf, visiblesAt } from '@bedrock-core/ui-runtime/compile';
import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { ConfirmReset, type ConfirmModel } from '../confirm.screen';
import { AddonList, type AddonListModel } from '../list.screen';
import { MenuList, type MenuListModel } from '../menu.screen';
import { ScopePicker, type PickerModel } from '../picker.screen';

/**
 * A compiled screen is baked from a render with no model, and shown with
 * one. Every entry the layout was numbered against has to be there in both
 * renders: an element that exists only when a model is present shifts every
 * entry after it, and presses and values land on the wrong controls.
 */

const press = (): void => {};

const shapeAgainstBake = <P,>(Screen: FunctionComponent<P>, shown: JSX.Element): { baked: string; shown: string } => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the bake renders a screen with no props, the way the build does
  const bare = Screen as FunctionComponent;
  const probe = probeLiveness(() => buildScreenTree(bare));
  const bake = buildScreenTree(bare);
  const present = buildScreenTree(shown);

  return {
    baked: shapeOf(bake, analyze(bake, visiblesAt(bake, probe.liveVisibles))),
    shown: shapeOf(present, analyze(present, visiblesAt(present, probe.liveVisibles))),
  };
};

describe('a compiled config screen keeps its shape when shown', () => {
  it('scope picker', () => {
    const model: PickerModel = { addonName: 'Economy', scopes: ['server', 'dimension', 'player'], onScope: press, onReset: press, onBack: press };
    const { baked, shown } = shapeAgainstBake(ScopePicker, <ScopePicker model={model} />);

    expect(shown).toBe(baked);
  });

  it('menu list, with rows, resets and pages', () => {
    const model: MenuListModel = {
      title: 'Economy > Player',
      rows: [{ title: 'Steve', subtitle: 'op', reset: true }, { title: 'Alex' }],
      empty: '',
      page: 2,
      pages: 3,
      onRow: press,
      onReset: press,
      onPage: press,
      onBack: press,
    };
    const { baked, shown } = shapeAgainstBake(MenuList, <MenuList model={model} />);

    expect(shown).toBe(baked);
  });

  it('reset confirmation', () => {
    const model: ConfirmModel = { title: 'Economy > Server', question: 'Reset?', onConfirm: press, onCancel: press };
    const { baked, shown } = shapeAgainstBake(ConfirmReset, <ConfirmReset model={model} />);

    expect(shown).toBe(baked);
  });

  it('addon list', () => {
    const model: AddonListModel = {
      rows: [{ id: 'a', name: 'A', version: '1' }, { id: 'b', name: 'B', version: '2', icon: 'x' }],
      selected: 1,
      main: { kind: 'page', slots: ['m', 't'] },
      onSelect: press,
      onSlot: press,
    };
    const { baked, shown } = shapeAgainstBake(AddonList, <AddonList model={model} />);

    expect(shown).toBe(baked);
  });
});
