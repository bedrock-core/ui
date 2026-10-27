import { afterEach, expect, it } from 'vitest';
import type { Player } from '@minecraft/server';
import { Button, Experimental_OreUI, Panel, Text, registerCompiledScreen, type FunctionComponent } from '@bedrock-core/ui-runtime';
import { __oreForms, uiManager } from '../../../../ui-runtime/src/__mocks__/@minecraft/server-ui';
import { buildScreenTree } from '../../../../ui-runtime/src/hosts/chest/build';
import { oreLayout } from '../../../../ui-runtime/src/hosts/ore/contract';
import { back, closeUi, navigate, setNavigator } from '../navigate';
import { currentLocation, historyOf } from '../history';

const p = { id: 'ore-navigation' } as Player;
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
function page(title: string, action?: () => unknown): FunctionComponent {
  const component: FunctionComponent = () => Experimental_OreUI({ title, children: Panel({ width: 200, height: 100,
    children: action === undefined
      ? { type: Text as FunctionComponent, props: { width: 180, height: 20, children: title } }
      : { type: Button as FunctionComponent, props: { width: 180, height: 30, onPress: action,
        children: { type: Text as FunctionComponent, props: { width: 160, height: 20, children: title } } } } }) });
  const layout = oreLayout(buildScreenTree(component), `nav_${title}`);
  registerCompiledScreen(component, { kind: 'custom', key: `ore:${title}`, title, snapshot: { ore: layout, shape: '', texts: [], vis: [] } });
  return component;
}
afterEach(() => { closeUi(p); uiManager.closeAllForms(p); __oreForms.length = 0; setNavigator(undefined); });

it('uses existing destination history, Back and close for experimental Ore screens', async () => {
  page('home'); page('details');
  expect(navigate('ore:home', p)).toBe(true); await tick();
  expect(currentLocation(p)?.key).toBe('ore:home');
  const first = __oreForms.at(-1)!;
  expect(navigate('ore:details', p)).toBe(true); await tick();
  expect(first.isShowing()).toBe(true);
  expect(__oreForms).toHaveLength(1);
  expect(first.show).toHaveBeenCalledTimes(1);
  expect(currentLocation(p)?.key).toBe('ore:details');
  expect(historyOf(p)).toHaveLength(1);
  expect(back(p)).toBe(true); await tick();
  expect(currentLocation(p)?.key).toBe('ore:home');
  expect(__oreForms.at(-1)!.isShowing()).toBe(true);
  closeUi(p); await tick();
  expect(__oreForms.at(-1)!.isShowing()).toBe(false);
  expect(currentLocation(p)).toBeUndefined();
});

it('keeps one native form through callback navigation and Back', async () => {
  page('home', () => navigate('ore:details', p));
  page('details', () => back(p));
  navigate('ore:home', p); await tick();
  const first = __oreForms.at(-1)!;
  first.buttons[0].onClick(); await tick();
  expect(first.isShowing()).toBe(true);
  const details = __oreForms.at(-1)!;
  expect(details).toBe(first);
  expect(typeof details.title === 'string' ? details.title : details.title.getData()).toBe('details');
  expect(details.isShowing()).toBe(true);
  details.buttons.find(button => button.options?.visible?.getData() && !String(typeof button.label === 'string' ? button.label : button.label.getData()).includes(':ready |'))!.onClick(); await tick();
  expect(details.isShowing()).toBe(true);
  expect(typeof details.title === 'string' ? details.title : details.title.getData()).toBe('home');
  expect(__oreForms.at(-1)!.isShowing()).toBe(true);
  expect(details.show).toHaveBeenCalledTimes(1);
});
