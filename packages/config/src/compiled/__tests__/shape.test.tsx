/** @jsxImportSource @bedrock-core/ui-runtime */
import { analyze, buildScreenTree, probeLiveness, shapeOf, visiblesAt } from '@bedrock-core/ui-runtime/compile';
import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { ConfirmReset, type ConfirmModel } from '../confirm.screen';
import { AddonList, type AddonListModel } from '../list.screen';
import { MenuList, type MenuListModel } from '../menu.screen';
import { ScopePicker, type PickerModel } from '../picker.screen';
import { configScreens, type LeafModel, type LeafProps } from '../shaped';
import type { ConfigDefinition } from '@bedrock-core/server-runtime';

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
    const model: PickerModel = { addonName: { translate: 'drav0011_economy.meta.name' }, scopes: ['server', 'dimension', 'player'], onScope: press, onReset: press, onBack: press };
    const { baked, shown } = shapeAgainstBake(ScopePicker, <ScopePicker model={model} />);

    expect(shown).toBe(baked);
  });

  it('menu list, with rows, resets and pages', () => {
    const model: MenuListModel = {
      trail: [{ translate: 'drav0011_economy.meta.name' }, { translate: 'core.scope.player.label' }],
      rows: [{ title: 'Steve', subtitle: 'op', action: 'reset' }, { title: 'Alex' }],
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
    const model: ConfirmModel = { trail: [{ translate: 'drav0011_economy.meta.name' }, 'Server'], question: 'Reset?', onConfirm: press, onCancel: press };
    const { baked, shown } = shapeAgainstBake(ConfirmReset, <ConfirmReset model={model} />);

    expect(shown).toBe(baked);
  });

  it('a shaped section, with every field kind', () => {
    const screens = configScreens({
      server: {
        pricing: {
          enabled: { type: 'boolean', default: true, label: 'Enabled' },
          rate: { type: 'number', default: 3, min: 0, max: 10, label: 'Rate' },
          mode: { type: 'enum', default: 'y', options: ['w', 'x', 'y', 'z'], label: 'Mode' },
          note: { type: 'string', default: '', label: 'Note' },
        },
      },
    } as ConfigDefinition);

    const Screen = screens['config_server_pricing'] as FunctionComponent<LeafProps> | undefined;

    expect(Screen).toBeDefined();

    if (Screen === undefined) { return; }

    const model: LeafModel = {
      trail: [{ translate: 'drav0011_economy.meta.name' }, { translate: 'core.scope.server.label' }, { translate: 'drav0011_economy.config.pricing' }],
      values: { 'pricing.enabled': false, 'pricing.rate': 7, 'pricing.mode': 'x', 'pricing.note': 'hello' },
      onSubmit: press,
    };
    const { baked, shown } = shapeAgainstBake(Screen, <Screen model={model} />);

    expect(shown).toBe(baked);
  });

  it('addon list', () => {
    const model: AddonListModel = {
      rows: [{ id: 'a', name: { translate: 'a.meta.name' }, version: '1' }, { id: 'b', name: 'B', version: '2', icon: 'x' }],
      selected: 1,
      main: { kind: 'page', slots: ['m', 't'] },
      onSelect: press,
      onSlot: press,
    };
    const { baked, shown } = shapeAgainstBake(AddonList, <AddonList model={model} />);

    expect(shown).toBe(baked);
  });
});
