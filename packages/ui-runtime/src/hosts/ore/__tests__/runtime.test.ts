import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import { __oreForms } from '../../../__mocks__/@minecraft/server-ui';
import { Button, Experimental_OreUI, Panel, Screen, Text, Form, Image, Scroll } from '../../../components';
import { buildScreenTree } from '../../chest/build';
import { render } from '../../../core/render/lifecycle';
import { registerCompiledScreen } from '../../../core/render/screens';
import { triggerCleanup } from '../../../core/render/session';
import { playerOwner } from '../../../core/fabric';
import { useExit, useState } from '../../../hooks';
import type { FunctionComponent, JSX } from '../../../jsx';
import { encodeOreState, ORE_STATE_PREFIX, oreLayout, oreValues, type OreState } from '../contract';

const players: Player[] = [];
let sequence = 0;
function player(): Player {
  const value = { id: `ore-test-${++sequence}` } as Player;
  players.push(value); return value;
}
function compile(component: FunctionComponent): void {
  const name = `ore_${++sequence}`;
  const layout = oreLayout(buildScreenTree(component), name);
  registerCompiledScreen(component, { kind: 'custom', key: `test:${name}`, title: name, snapshot: { ore: layout, shape: '', baked: [], vis: [] } });
}
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
function state(form = __oreForms.at(-1)!): OreState {
  return JSON.parse(form.labels.find(label => label.getData().startsWith(ORE_STATE_PREFIX))!.getData().slice(ORE_STATE_PREFIX.length)) as OreState;
}
function activeButton(form = __oreForms.at(-1)!, ready = false) {
  return form.buttons.find(button => button.options?.visible?.getData() && String(typeof button.label === 'string' ? button.label : button.label.getData()).includes(':ready |') === ready)!;
}
function screen(children: JSX.Node): JSX.Element {
  return el(Experimental_OreUI, { title: 'Ore test', children: el(Panel, { width: 240, height: 140, children }) });
}
function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test factory for native and function components
  return { type, props } as JSX.Element;
}
function button(action: () => unknown, text = 'Increment'): JSX.Element {
  return el(Button, { width: 200, height: 30, onPress: action, children: el(Text, { width: 180, height: 20, children: text }) });
}
afterEach(() => {
  for (const p of players.splice(0)) { triggerCleanup(playerOwner(p), true); }
  __oreForms.length = 0;
});

describe('experimental Ore sessions', () => {
  it('publishes live solved geometry, Scroll extents and text styling without changing the compiled baseline', () => {
    const page=(width:number,height:number,color:readonly[number,number,number]):JSX.Element=>screen(el(Scroll,{width:220,height:80,children:el(Panel,{width,height,children:el(Text,{children:'Live caption',color})})}));
    const layout=oreLayout(buildScreenTree(()=>page(180,120,[1,1,1])),'live_layout'),before=JSON.stringify(layout);
    const values=oreValues(buildScreenTree(()=>page(200,240,[1,0,0])),layout);
    expect(values.some(value=>value.rect)).toBe(true);
    expect(values.find(value=>value.scroll)!.scroll!.extent).toBeGreaterThan(120);
    expect(values.find(value=>value.text==='Live caption')!.textStyle!.color).toEqual([1,0,0]);
    expect(JSON.stringify(layout)).toBe(before);
    expect(oreValues(buildScreenTree(()=>page(180,120,[1,1,1])),layout).some(value=>value.rect||value.scroll||value.textStyle)).toBe(false);
  });
  it('preserves formatting positions while refusing unsupported effects explicitly', () => {
    const page=(text:string):JSX.Element=>screen(el(Text,{width:220,height:30,children:text}));
    const layout=oreLayout(buildScreenTree(()=>page('A §cRed§r!')),'formatting');
    expect(oreValues(buildScreenTree(()=>page('A §cRed§r!')),layout).find(value=>value.text==='A Red!')!.formatting).toEqual([[2,'c'],[5,'r']]);
    expect(()=>oreLayout(buildScreenTree(()=>page('§kUnreadable')),'unsupported_effect')).toThrow(/Unsupported Ore text formatting/);
  });
  it('blocks forced events inside a hidden scroll viewport', async () => {
    let calls=0;
    const Page=():JSX.Element=>screen(el(Scroll,{width:220,height:100,visible:false,children:button(()=>{calls++;})}));
    compile(Page); render(Page,player());
    const form=__oreForms.at(-1)!;
    expect(form.buttons[0].options?.visible?.getData()).toBe(false);
    form.buttons[0].onClick(); await tick(); expect(calls).toBe(0);
  });
  it('carries changed background faces while refusing root scale changes', () => {
    const page = (background: string, uiScale = 3): JSX.Element => el(Experimental_OreUI, { uiScale, children: el(Button, { width: 140, height: 20, background, children: el(Text, { children: 'Action' }) }) });
    const layout = oreLayout(buildScreenTree(() => page('textures/ui/first')), 'styles');
    expect(oreValues(buildScreenTree(() => page('textures/ui/second')), layout).find(value => value.backgrounds)?.backgrounds?.normal).toBe('pack://textures/ui/second.png');
    expect(() => oreValues(buildScreenTree(() => page('textures/ui/first', 5)), layout)).toThrow(/presentation scale changed/);
  });
  it('accepts equivalent static PNG spelling and rejects a changed texture', () => {
    const image = (texture: string): JSX.Element => screen(el(Image, { width: 16, height: 16, texture }));
    const compiled = oreLayout(buildScreenTree(() => image('textures/ui/icon')), 'static_image');
    expect(() => oreValues(buildScreenTree(() => image('textures/ui/icon.png')), compiled)).not.toThrow();
    expect(() => oreValues(buildScreenTree(() => image('textures/ui/other')), compiled)).toThrow(/image texture changed/);
  });
  it('updates hooks and counter acknowledgement without another native show', async () => {
    const Counter = (): JSX.Element => {
      const [count, setCount] = useState(0);
      return screen([el(Text, { width: 200, height: 20, children: `Count ${count}` }), button(() => setCount(n => n + 1))]);
    };
    compile(Counter); render(Counter, player());
    const form = __oreForms.at(-1)!;
    form.buttons[0].onClick(); form.buttons[0].onClick();
    await tick();
    expect(state(form).values.some(value => value.text === 'Count 1')).toBe(true);
    expect(state(form).ack).toBe(1);
    expect(form.show).toHaveBeenCalledTimes(1);
    expect(__oreForms).toHaveLength(1);
  });
  it('publishes background state and blocks a stale callback after navigation', async () => {
    let set: (n: number) => void = () => {};
    let staleCalls = 0;
    const Counter = (): JSX.Element => {
      const [count, update] = useState(0); set = update;
      return screen([el(Text, { width: 200, height: 20, children: `Value ${count}` }), button(() => { staleCalls++; })]);
    };
    const Next = (): JSX.Element => screen(button(() => {}));
    compile(Counter); compile(Next);
    const p = player(); render(Counter, p);
    const old = __oreForms.at(-1)!;
    const first = state(old);
    set(7); await tick();
    expect(state(old).values.some(value => value.text === 'Value 7')).toBe(true);
    render(Next, p); await tick();
    old.buttons[0].onClick(); await tick();
    expect(staleCalls).toBe(0);
    expect(__oreForms.at(-1)!.isShowing()).toBe(true);
    expect(__oreForms).toHaveLength(1);
    expect(old.show).toHaveBeenCalledTimes(1);
    expect(state(old).transport).toBe(first.transport);
    expect(state(old).session).not.toBe(first.session);
  });
  it('keeps asynchronous callbacks isolated between players', async () => {
    let release!: () => void;
    let calls = 0;
    const Page = (): JSX.Element => screen(button(async () => { calls++; await new Promise<void>(resolve => { release = resolve; }); }));
    compile(Page);
    render(Page, player()); const a = __oreForms.at(-1)!;
    render(Page, player()); const b = __oreForms.at(-1)!;
    a.buttons[0].onClick(); await tick();
    a.buttons[0].onClick();
    activeButton(b, true).onClick(); await tick();
    expect(calls).toBe(1); expect(state(b).ack).toBe(1); expect(state(a).ack).toBe(0);
    release(); await tick(); expect(state(a).ack).toBe(1);
  });
  it('closes through useExit and opens a fresh session', async () => {
    const Page = (): JSX.Element => { const exit = useExit(); return screen(button(exit)); };
    compile(Page); const p = player(); render(Page, p);
    const first = __oreForms.at(-1)!; first.buttons[0].onClick(); await tick();
    expect(first.isShowing()).toBe(false);
    render(Page, p); expect(state().session).not.toBe(state(first).session);
  });
  it('refuses a form root nested inside the live screen', () => {
    const Bad = (): JSX.Element => screen(el(Form, {}));
    expect(() => compile(Bad)).toThrow(/cannot sit inside/);
  });
  it('rejects forced native events on a disabled control', async () => {
    let calls = 0;
    const Page = (): JSX.Element => screen(el(Button, { width: 200, height: 30, enabled: false, onPress: () => { calls++; }, children: el(Text, { width: 180, height: 20, children: 'Disabled' }) }));
    compile(Page); render(Page, player());
    const form = __oreForms.at(-1)!;
    expect(form.buttons[0].options?.disabled?.getData()).toBe(true);
    form.buttons[0].onClick(); await tick(); expect(calls).toBe(0);
  });
  it('does not acknowledge or close a successor when an old async callback finishes', async () => {
    let release!: () => void;
    const Old = (): JSX.Element => screen(button(() => new Promise<void>(resolve => { release = resolve; })));
    const Next = (): JSX.Element => screen(button(() => {}));
    compile(Old); compile(Next); const p = player(); render(Old, p);
    __oreForms.at(-1)!.buttons[0].onClick(); await tick();
    render(Next, p); await tick(); const successor = __oreForms.at(-1)!;
    release(); await tick();
    expect(successor.isShowing()).toBe(true); expect(state(successor).ack).toBe(0);
    activeButton(successor).onClick(); await tick(); expect(state(successor).ack).toBe(1);
  });
  it('checks the observable limit before passing it to the engine', () => {
    expect(() => encodeOreState({ schema: 'core-ore-state/1', screen: 'x', session: 1, revision: 1, ack: 0, asset: '/hbui/core-ore/x.json', values: [{ id: 'n', text: 'x'.repeat(5000), visible: true, enabled: true }] })).toThrow(/5000-character/);
  });
  it('closes a retained backing form when the destination fails to build', async () => {
    let broken = false;
    const Good = (): JSX.Element => screen(button(() => {}));
    const Bad = (): JSX.Element => { if (broken) { throw new Error('Destination unavailable'); } return screen(button(() => {})); };
    compile(Good); compile(Bad); const p = player(); render(Good, p);
    const native = __oreForms.at(-1)!;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try { broken = true; render(Bad, p); await tick(); expect(native.isShowing()).toBe(false); }
    finally { log.mockRestore(); }
  });
  it('reallocates the native host only when a later registration exceeds its pool', async () => {
    const Small = (): JSX.Element => screen(button(() => {}));
    compile(Small); const p = player(); render(Small, p);
    const first = __oreForms.at(-1)!;
    const transport = state(first).transport;
    const Large = (): JSX.Element => screen([button(() => {}), button(() => {}), button(() => {})]);
    compile(Large); render(Large, p); await tick();
    expect(first.isShowing()).toBe(false);
    const current = __oreForms.at(-1)!;
    expect(current).not.toBe(first); expect(current.isShowing()).toBe(true);
    expect(state(current).transport).not.toBe(transport);
    expect(current.buttons.filter(button => button.options?.visible?.getData() && /:n[^:]* \|/.test(String(typeof button.label === 'string' ? button.label : button.label.getData())))).toHaveLength(3);
  });
  it('closes only the owning transport when its dismissal control is dispatched', async () => {
    const Page=():JSX.Element=>screen(button(()=>{}));compile(Page);const p=player();render(Page,p);
    const native=__oreForms.at(-1)!;
    native.buttons.find(button=>button.options?.visible?.getData()&&String(typeof button.label==='string'?button.label:button.label.getData()).includes(':dismiss |'))!.onClick();
    await tick();expect(native.isShowing()).toBe(false);
  });
  it('ignores a dismissal queued by the outgoing destination', async () => {
    const First=():JSX.Element=>screen(button(()=>{})),Next=():JSX.Element=>screen(button(()=>{}));
    compile(First);compile(Next);const p=player();render(First,p);const native=__oreForms.at(-1)!;
    const oldDismiss=native.buttons.find(button=>button.options?.visible?.getData()&&String(typeof button.label==='string'?button.label:button.label.getData()).includes(':dismiss |'))!;
    render(Next,p);await tick();oldDismiss.onClick();await tick();
    expect(native.isShowing()).toBe(true);expect(native.show).toHaveBeenCalledTimes(1);
  });
  it('closes the retained native form when switching to another host', async () => {
    const Ore = (): JSX.Element => screen(button(() => {}));
    const Legacy = (): JSX.Element => el(Screen, { children: el(Text, { width: 180, height: 20, children: 'Native destination' }) });
    compile(Ore);
    registerCompiledScreen(Legacy, { key: 'test:legacy_ore_exit', title: 'Legacy destination' });
    const p = player(); render(Ore, p); const native = __oreForms.at(-1)!;
    render(Legacy, p); await tick();
    expect(native.isShowing()).toBe(false);
    expect(__oreForms).toHaveLength(1);
  });
});
