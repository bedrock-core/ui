import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { ORE_CLIENT_SOURCE } from '../client';
import type { OreNode } from '@bedrock-core/ui-runtime/compile';

class Event {
  target?: Element;
  stopped = false; defaultPrevented = false;
  key?: string; keyCode?: number; repeat?: boolean; shiftKey?: boolean; button?: number;
  deltaY?: number; deltaMode?: number; wheelDelta?: number; clientY?: number; clientX?: number;
  constructor(public type: string, readonly options: { bubbles?: boolean; key?: string; repeat?: boolean; shiftKey?: boolean; button?: number; deltaY?: number; deltaMode?: number; clientY?: number; clientX?: number } = {}) { Object.assign(this, options); }
  preventDefault(): void { this.defaultPrevented = true; }
  stopPropagation(): void { this.stopped = true; }
  stopImmediatePropagation(): void { this.stopped = true; }
}
class Element {
  constructor(readonly tagName = 'div') {}
  id = ''; tabIndex = -1;
  value = ''; disabled = false;
  onFocus?: () => void;
  focus(): void { this.onFocus?.(); this.dispatchEvent(new Event('focus')); }
  style: Record<string, string | number | undefined> = { cssText: '' };
  attrs: Record<string, string> = {};
  parentNode: Element | null = null;
  children: Element[] = [];
  private text = '';
  private handlers = new Map<string, ((event: Event) => void)[]>();
  get parentElement(): Element | null { return this.parentNode; }
  get textContent(): string { return this.text + this.children.map(child => child.textContent).join(''); }
  set textContent(value: string) { this.text = value; this.children = []; }
  appendChild(child: Element): void { child.parentNode = this; this.children.push(child); }
  removeChild(child: Element): void { this.children = this.children.filter(node => node !== child); child.parentNode = null; }
  contains(child: Element): boolean { return this === child || this.children.some(node => node.contains(child)); }
  querySelectorAll(selector: string): Element[] {
    const all = this.children.flatMap(child => [child, ...child.querySelectorAll('')]);
    return !selector || selector === '*' ? all : all.filter(node => selector.split(',').includes(node.tagName));
  }
  setAttribute(key: string, value: string): void { this.attrs[key] = value; }
  getAttribute(key: string): string | null { return this.attrs[key] ?? null; }
  hasAttribute(key: string): boolean { return key in this.attrs; }
  removeAttribute(key: string): void { delete this.attrs[key]; }
  addEventListener(type: string, callback: (event: Event) => void): void {
    this.handlers.set(type, [...this.handlers.get(type) ?? [], callback]);
  }
  removeEventListener(type: string, callback: (event: Event) => void): void {
    this.handlers.set(type, (this.handlers.get(type) ?? []).filter(handler => handler !== callback));
  }
  dispatchEvent(event: Event): boolean {
    event.target ??= this;
    for (const callback of this.handlers.get(event.type) ?? []) callback(event);
    if (event.options.bubbles && !event.stopped) this.parentNode?.dispatchEvent(event);
    return true;
  }
}

/** DOM protocol harness; it cannot establish Gameface rendering or native trust. */
interface FixtureNode { id: string; kind: string; rect: number[]; parent?: string; switch?: OreNode['switch']; gates?: OreNode['gates']; initial?: OreNode['initial']; button?: string; source?: string; backgrounds?: Record<string, string>; region?: number; scroll?: { id: number; viewport: number[]; extent: number }; field?: OreNode['field']; localize?: boolean; flow?: OreNode['flow']; input?: boolean | string | number }
interface FixtureLayout { schema: string; screen: string; asset: string; title: string; canvas: { width: number; height: number }; nodes: FixtureNode[];
  textures: Record<string, { size: number[]; base?: number[]; slice?: number[] }>; view?: { bounds: number[]; uiScale?: number } }
function harness(acknowledge = true, nativeTag = 'div', wrappedTargets = false, legacyMouseEvents = false, withImage = false, prepare?: (layout: FixtureLayout) => void) {
  const eventSupport = { constructor: true, legacy: true, mouseConstructor: !legacyMouseEvents, legacyMouse: true };
  const eventFactories: string[] = [], nativeEvents: string[] = [];
  const doc = new Element('document'), body = new Element(), root = new Element(), frame = new Element(nativeTag); root.id = 'root';
  doc.appendChild(body);
  body.appendChild(root); root.appendChild(frame);
  const title = new Element(nativeTag); title.textContent = 'Owned Ore form'; frame.appendChild(title);
  const nativeContent = new Element(nativeTag); frame.appendChild(nativeContent);
  const carrier = new Element(nativeTag), action = new Element(nativeTag), ready = new Element(nativeTag), dismiss = new Element('button');
  let closeCalls=0;
  nativeContent.appendChild(dismiss);dismiss.addEventListener('click',()=>{closeCalls++;});
  nativeContent.appendChild(carrier);
  let actionTarget = action, readyTarget = ready;
  if (wrappedTargets) {
    const actionWrapper = new Element(), readyWrapper = new Element();
    actionTarget = new Element('button'); readyTarget = new Element('button');
    actionTarget.appendChild(action); readyTarget.appendChild(ready);
    actionWrapper.appendChild(actionTarget); readyWrapper.appendChild(readyTarget);
    nativeContent.appendChild(actionWrapper); nativeContent.appendChild(readyWrapper);
  } else { nativeContent.appendChild(action); nativeContent.appendChild(ready); }
  const faces = { normal: 'pack://textures/ui/demo/base.png', hover: 'pack://textures/ui/demo/hover.png', pressed: 'pack://textures/ui/demo/pressed.png', disabled: 'pack://textures/ui/demo/disabled.png' };
  const nodes: FixtureNode[] = [
    { id: 'n_0', kind: 'panel', rect: [0, 0, 300, 150] },
    { id: 'n_0_0', kind: 'button', rect: [10, 20, 200, 30], backgrounds: faces },
    { id: 'n_0_0_0', kind: 'text', rect: [10, 20, 180, 20] },
  ];
  if (withImage) {
    nodes[2].button = 'n_0_0'; nodes[2].rect = [34, 20, 170, 20];
    nodes.push({ id: 'n_0_0_1', kind: 'image', rect: [14, 20, 16, 16], button: 'n_0_0', source: 'pack://textures/ui/demo/icon.png' });
  }
  const layout: FixtureLayout = { schema: 'core-ore-layout/1', screen: 'demo', asset: '/hbui/core-ore/demo.json', title: 'Owned Ore form', canvas: { width: 320, height: 210 }, nodes,
    textures: Object.fromEntries(Object.values(faces).map(source => [source, { size: [5,7], base: [5,7], slice: [2,2,2,4] }])) };
  prepare?.(layout);
  let session = 1, ack = 0, revision = 0, calls = 0, now = 0, enabled = true, visible = true, scan = (): void => {}, notify = (): void => {};
  let valueOverrides: Record<string, Record<string, unknown>> = {};
  const packets: { session: number; sequence: number; id: string; value: unknown }[] = [];
  const mailbox = new Element(), mailboxLabel = new Element(), mailboxInput = new Element('input');
  mailbox.appendChild(mailboxLabel); mailbox.appendChild(mailboxInput);
  if (layout.nodes.some(node => node.field)) { nativeContent.appendChild(mailbox); }
  function acknowledgeField(value: unknown = packets.at(-1)?.value): void {
    const node = layout.nodes.find(node => node.id === packets.at(-1)?.id)!;
    node.input = value as string | boolean | number; ack++; publish();
  }
  const nativeChanged = (): void => {
    packets.push(JSON.parse(mailboxInput.value) as typeof packets[number]);
    if (acknowledge) { acknowledgeField(); }
  };
  doc.addEventListener('core-ore-field-change', event => { if (event.target === mailboxInput) nativeEvents.push(event.type); });
  const queue: (() => void)[] = [];
  const timers: { at: number; callback: () => void }[] = [];
  function publish(): void {
    mailboxLabel.textContent = 'CORE_ORE_INPUT:' + session + ' | Change field';
    action.textContent = 'CORE_ORE_ACTION:' + session + ':n_0_0 | Count';
    ready.textContent = 'CORE_ORE_ACTION:' + session + ':ready | Enable custom view';
    dismiss.textContent = 'CORE_ORE_ACTION:' + session + ':dismiss | Close experimental screen';
    carrier.textContent = 'CORE_ORE_STATE:' + JSON.stringify({ schema: 'core-ore-state/1', screen: layout.screen, session, transport: 7, revision: ++revision, ack, asset: layout.asset,
      title: layout.title, values: layout.nodes.map(node => ({ id: node.id, text: node.kind === 'panel' ? '' : `Count ${calls}`, visible, enabled, ...node.field ? { input: node.input } : {}, ...valueOverrides[node.id] })) });
    notify();
  }
  action.textContent = 'CORE_ORE_ACTION:1:n_0_0 | Count';
  ready.textContent = 'CORE_ORE_ACTION:1:ready | Enable custom view';
  const targets: string[] = [];
  actionTarget.addEventListener('click', event => { targets.push(event.target!.tagName); calls++; if (acknowledge) ack++; publish(); });
  readyTarget.addEventListener('click', event => { targets.push(event.target!.tagName); ack++; publish(); });
  publish();
  let observed: Element | undefined;
  const window: Record<string, unknown> = { innerWidth: 1280, innerHeight: 800,
    setInterval: (fn: () => void) => { scan = fn; }, setTimeout: (fn: () => void, delay = 0) => { timers.push({ at: now + delay, callback: fn }); }, requestAnimationFrame: (fn: () => void) => { queue.push(fn); },
    addEventListener: (): void => {}, MutationObserver: class { constructor(fn: () => void) { notify = fn; } observe(node: Element): void { observed = node; } disconnect(): void {} } };
  class XHR {
    status = 200; timeout = 0; responseText = JSON.stringify(layout);
    onload?: () => void;
    open(): void {}
    send(): void { this.onload?.(); }
  }
  const document = Object.assign(doc, { body, activeElement: root, getElementById: (id: string) => [body, ...body.querySelectorAll('')].find(node => node.id === id),
    createElement: (tag: string) => { const node = new Element(tag); node.onFocus = () => { document.activeElement = node; }; return node; },
    createEvent: (type: string) => {
      eventFactories.push(type);
      if (!(eventSupport.legacy && (type === 'Event' || type === 'Events')) && !(eventSupport.legacyMouse && (type === 'MouseEvent' || type === 'MouseEvents'))) return null;
      const event=new Event('',{bubbles:true});return Object.assign(event,{initMouseEvent:(name:string):void=>{event.type=name;},initEvent:(name:string):void=>{event.type=name;}});
    } });
  new Script(ORE_CLIENT_SOURCE).runInNewContext({ window, document,
    XMLHttpRequest: XHR,
    Event: class extends Event { constructor(type: string, options = {}) { if (!eventSupport.constructor) throw new Error('Constructor unavailable'); super(type, options); } },
    MouseEvent: class extends Event { constructor(type: string, options = {}) { if (!eventSupport.mouseConstructor) throw new Error('Constructor unavailable'); super(type, options); } },
    Date: { now: () => now } });
  const bindNativeInput = window.__coreOreBindNativeInput as (input: Element, changed: () => void) => () => void;
  const unbindNativeInput = bindNativeInput(mailboxInput, nativeChanged);
  const debug = window.__coreOreDebug as Record<string, unknown>;
  const button = () => body.querySelectorAll('').filter(node => node.attrs['data-core-ore-id'] === 'n_0_0').at(-1)!;
  const flush = (): void => {
    let count = 0;
    for (;;) {
      for (let index = timers.length - 1; index >= 0; index--) if (timers[index].at <= now) queue.push(timers.splice(index, 1)[0].callback);
      if (!queue.length) return;
      if (++count > 30) throw new Error('Refresh loop');
      queue.shift()!();
    }
  };
  const loadImages = (): void => { for (const image of body.querySelectorAll('img')) image.dispatchEvent(new Event('load')); };
  return { body, root, frame, carrier, nativeContent, debug, targets, document, window, packets, eventSupport, eventFactories, nativeEvents, mailboxInput, unbindNativeInput, acknowledgeField, closeCalls:()=>closeCalls, observed: () => observed, flush, scan: () => scan(), button, calls: () => calls,
    serverField: (name: string, value: string | boolean | number) => { layout.nodes.find(node => node.field?.name === name)!.input = value; publish(); },
    key: (key: string, type = 'keydown', repeat = false, shiftKey = false) => doc.dispatchEvent(new Event(type, { key, repeat, shiftKey })),
    publish, values:(overrides:Record<string,Record<string,unknown>>)=>{valueOverrides=overrides;publish();}, removeCarrier: () => { nativeContent.removeChild(carrier); notify(); }, restoreCarrier: () => { nativeContent.appendChild(carrier); publish(); },
    availability: (nextEnabled: boolean, nextVisible = true) => { enabled = nextEnabled; visible = nextVisible; publish(); },
    loadImages,
    navigate: (screen: string, completeImages = true) => { layout.screen = screen; layout.asset = '/hbui/core-ore/' + screen + '.json'; session++; ack = revision = 0; publish(); if (completeImages) { flush(); loadImages(); flush(); } },
    acknowledge: () => { ack++; publish(); }, advance: () => { now += 5100; scan(); }, close: () => { root.removeChild(frame); scan(); },
    reopen: () => { session++; ack = revision = 0; root.appendChild(frame); publish(); scan(); },
    elapse: (ms: number) => { now += ms; } };
}

describe('standalone Ore client protocol', () => {
  it('switches tabs and inherited selection gates without a server callback', () => {
    const h=harness(true,'div',false,false,false,layout=>layout.nodes.push(
      {id:'n_1',kind:'switch',rect:[0,0,40,20],switch:{group:'tabs',exclusive:true,index:0,on:false,passive:false}},
      {id:'n_2',kind:'switch',rect:[40,0,40,20],switch:{group:'tabs',exclusive:true,index:1,on:false,passive:false}},
      {id:'n_3',kind:'panel',rect:[0,20,80,40],gates:[{selection:'n_3',group:'tabs',indexes:[1]}]},
      {id:'n_4',kind:'text',parent:'n_3',rect:[0,20,80,20]},
      {id:'n_5',kind:'panel',rect:[0,0,40,20],gates:[{owner:'n_1',states:['on','onHover']}]},
    ));h.flush();
    const node=(id:string)=>h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']===id)!;
    expect(node('n_3').style.display).toBe('none');expect(node('n_4').style.display).toBe('none');expect(node('n_5').style.display).toBe('');
    node('n_2').dispatchEvent(new Event('mousedown'));h.flush();
    expect(node('n_3').style.display).toBe('');expect(node('n_4').style.display).toBe('');expect(node('n_5').style.display).toBe('none');
    h.publish();h.flush();expect(node('n_3').style.display).toBe('');expect(h.calls()).toBe(0);expect(h.packets).toEqual([]);
  });
  it('assembles a split frame atomically and preserves spaces at part boundaries', () => {
    const h=harness();h.flush();const state=JSON.parse(h.carrier.textContent.slice('CORE_ORE_STATE:'.length));
    state.revision++;state.values[2].text='first '+ ' '.repeat(7000)+'last';
    const text='CORE_ORE_STATE:'+JSON.stringify(state),cut=text.indexOf(' '.repeat(100))+50;
    const header={schema:'core-ore-frame/1',session:state.session,revision:state.revision,transport:state.transport,screen:state.screen,asset:state.asset,title:state.title,parts:3};
    h.carrier.textContent='CORE_ORE_STATE:'+JSON.stringify(header);h.scan();
    const caption=h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_0_0_0')!.children[0];
    expect(caption.textContent).toBe('Count 0');expect(h.debug.status).toBe('assembling screen');
    const add=(index:number,chunk:string)=>{const part=new Element();part.textContent='CORE_ORE_PART:'+state.session+':'+state.revision+':'+index+'|'+chunk;h.nativeContent.appendChild(part);};
    const raw=text.slice(cut),middle=Math.floor(raw.length/2);
    add(0,text.slice(0,cut));add(1,raw.slice(0,middle));h.scan();expect(caption.textContent).toBe('Count 0');
    add(2,raw.slice(middle));h.scan();expect(caption.textContent).toBe(state.values[2].text);expect(h.debug.error).toBeNull();
  });
  it('reads unchanged values from the compiled baseline in a sparse frame', () => {
    const h=harness(true,'div',false,false,false,layout=>layout.nodes.forEach(node=>{node.initial={id:node.id,text:node.kind==='panel'?'':'Count 0',visible:true,enabled:true};}));h.flush();
    const state=JSON.parse(h.carrier.textContent.slice('CORE_ORE_STATE:'.length));state.revision++;state.values=[];
    h.carrier.textContent='CORE_ORE_STATE:'+JSON.stringify(state);h.scan();
    expect(h.debug.error).toBeNull();expect(h.button().attrs['aria-disabled']).toBe('false');
  });
  it('keeps an idle presentation across a carrier-only DOM replacement and releases a closed form', () => {
    const h = harness(); h.flush(); const layer = h.document.getElementById('core-ore-presentation');
    h.removeCarrier(); h.flush(); h.elapse(100); h.scan();
    expect(h.debug.status).toBe('switching screen'); expect(h.document.getElementById('core-ore-presentation')).toBe(layer);
    h.button().dispatchEvent(new Event('mousedown')); expect(h.calls()).toBe(0);
    h.restoreCarrier(); h.flush(); expect(h.document.getElementById('core-ore-presentation')).toBe(layer);
    expect(h.debug.status).toBe('active'); h.close();
    expect(h.document.getElementById('core-ore-presentation')).toBeUndefined();
  });
  it('retains the mounted layer and outgoing page until every destination image is loaded', () => {
    const h = harness(true, 'div', false, false, true); h.flush();
    const layer = h.document.getElementById('core-ore-presentation')!, old = h.button(), outgoing = old.parentElement!;
    h.navigate('details', false); h.flush();
    const destination = h.button().parentElement!;
    expect(h.document.getElementById('core-ore-presentation')).toBe(layer);
    expect(outgoing.parentElement).toBe(layer); expect(outgoing.style.visibility).toBe('visible');
    expect(destination.style.visibility).toBe('hidden'); expect(h.frame.style.visibility).toBe('hidden');
    old.dispatchEvent(new Event('mousedown')); h.button().dispatchEvent(new Event('mousedown'));
    expect(h.calls()).toBe(0);
    const images = destination.querySelectorAll('img');
    images[0].dispatchEvent(new Event('load')); images[0].dispatchEvent(new Event('load')); h.flush();
    expect(h.debug.imagesLoaded).toBe(1); expect(outgoing.parentElement).toBe(layer);
    for (const image of images.slice(1)) image.dispatchEvent(new Event('load'));
    h.flush();
    expect(destination.style.visibility).toBe('visible'); expect(outgoing.parentElement).toBeNull();
    expect(h.document.getElementById('core-ore-presentation')).toBe(layer); expect(h.debug.status).toBe('active');
    h.button().dispatchEvent(new Event('mousedown')); h.flush(); expect(h.calls()).toBe(1);
  });
  it('retains the visible page when an unfinished destination is superseded', () => {
    const h = harness(); h.flush(); const outgoing = h.button().parentElement!;
    h.navigate('details', false); h.flush(); const superseded = h.button().parentElement!;
    h.navigate('third', false); h.flush();
    expect(superseded.parentElement).toBeNull(); expect(outgoing.parentElement).not.toBeNull();
    for (const image of superseded.querySelectorAll('img')) { image.dispatchEvent(new Event('load')); image.dispatchEvent(new Event('error')); }
    h.flush(); expect(h.debug.imagesLoaded).toBe(0); expect(h.debug.error).toBeNull();
    h.loadImages(); h.flush(); expect(outgoing.parentElement).toBeNull(); expect(h.debug.status).toBe('active');
  });
  it('closes a destination whose assets stall without exposing the native transport', () => {
    const h = harness(); h.flush(); h.navigate('details', false); h.flush(); h.advance();
    expect(h.debug.status).toBe('failed'); expect(h.debug.error).toContain('Destination assets loading timed out');
    expect(h.debug.closeRequested).toBe(true); expect(h.frame.style.visibility).toBe('hidden');
  });
  it('removes both navigation pages on close and ignores late image callbacks', () => {
    const h = harness(); h.flush(); h.navigate('details', false); h.flush();
    const images = h.body.querySelectorAll('img'); h.close();
    for (const image of images) image.dispatchEvent(new Event('load'));
    h.flush(); expect(h.document.getElementById('core-ore-presentation')).toBeUndefined();
    expect(h.frame.style.visibility).toBeUndefined();
  });
  it.each(['mouseenter','mouseleave','mouseup','focus','mousedown','keydown'])('ignores a detached control %s after leaving the Ore host',type=>{
    const h=harness();h.flush();const old=h.button();h.close();h.flush();
    expect(()=>old.dispatchEvent(new Event(type,{key:'Enter'}))).not.toThrow();expect(h.calls()).toBe(0);
  });
  it('rejects queued events from an old presentation when a destination reuses its control IDs',()=>{
    const h=harness();h.flush();const old=h.button();h.navigate('details');h.flush();
    expect(h.button()).not.toBe(old);
    for(const type of ['mouseenter','mouseleave','mouseup','focus','mousedown','keydown'])old.dispatchEvent(new Event(type,{key:'Enter',bubbles:true}));
    h.flush();expect(h.calls()).toBe(0);expect(h.debug.error).toBeNull();
    h.button().dispatchEvent(new Event('mousedown'));h.flush();expect(h.calls()).toBe(1);
  });
  it('uses the desktop reference at the 1440px threshold and keeps a viewport fit margin',()=>{
    const h=harness();h.window.innerWidth=2560;h.window.innerHeight=1440;h.flush();
    expect(h.debug.scale).toBe(5);
    h.window.innerWidth=1920;h.window.innerHeight=1080;h.scan();expect(h.debug.scale).toBe(4);
  });
  it('anchors multiline captions at the top of the solved rectangle',()=>{
    const h=harness();h.flush();h.values({'n_0_0_0':{text:'first\nsecond\nthird'}});h.flush();
    const caption=h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_0_0_0')!.children[0];
    expect(caption.style.cssText).toContain('align-items:flex-start');
  });
  it('applies live geometry and restores baseline boxes without remounting the page',()=>{
    const h=harness();h.flush();const caption=h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_0_0_0')!;
    h.values({'n_0_0_0':{rect:[20,40,100,12]}});h.flush();
    expect(caption.style.left).toBe(20*Number(h.debug.scale)+'px');expect(caption.style.height).toBe(12*Number(h.debug.scale)+'px');
    h.values({});h.flush();expect(caption.style.left).toBe(10*Number(h.debug.scale)+'px');
    expect(h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_0_0_0')).toBe(caption);
  });
  it('preserves Minecraft caption colors, bold, italic and reset while accepting live text styles',()=>{
    const h=harness();h.flush();h.values({'n_0_0_0':{text:'Red normal',formatting:[[0,'c'],[0,'l'],[0,'o'],[3,'r']],textStyle:{scale:1,align:'left',font:'default',shadow:false,offset:[0,0],color:[0,1,0]}}});h.flush();
    const caption=h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_0_0_0')!.children[0],spans=caption.querySelectorAll('').filter(node=>node.tagName==='span');
    expect(spans[0].style.color).toBe('#ff5555');expect(spans[0].style.fontWeight).toBe('bold');expect(spans[0].style.fontStyle).toBe('italic');
    expect(spans[1].style.color).toBe('inherit');expect(spans[1].style.fontWeight).toBe('normal');
    h.values({'n_0_0_0':{text:'Plain'}});h.flush();expect(caption.textContent).toBe('Plain');expect(caption.children).toHaveLength(0);
  });
  it('packs visible children of a vertical stack with the original gap',()=>{
    const h=harness(true,'div',false,false,false,layout=>{
      layout.nodes[0].flow={column:true};layout.nodes[2].flow={parent:'n_0',gap:2};
      layout.nodes.push({id:'n_1',kind:'text',rect:[10,42,100,20],flow:{parent:'n_0',gap:2}});
    });h.flush();
    const last=h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_1')!;
    expect(last.style.marginTop).toBe(2*Number(h.debug.scale)+'px');
    h.values({'n_0_0_0':{visible:false}});h.flush();expect(last.style.marginTop).toBe('0px');
  });
  it('anchors absolute descendants to a moving flow container',()=>{
    const h=harness(true,'div',false,false,false,layout=>{
      layout.nodes[0].flow={column:true};
      layout.nodes[1].parent='n_0';layout.nodes[1].flow={parent:'n_0',column:true};
      layout.nodes[2].parent='n_0_0';
    });h.flush();
    const nodes=h.body.querySelectorAll(''),parent=nodes.find(node=>node.attrs['data-core-ore-id']==='n_0_0')!,caption=nodes.find(node=>node.attrs['data-core-ore-id']==='n_0_0_0')!;
    expect(caption.parentNode).toBe(parent);expect(caption.style.left).toBe('0px');
    h.values({'n_0_0':{rect:[5,10,100,20]},'n_0_0_0':{rect:[8,14,100,20]}});h.flush();
    expect(caption.style.left).toBe(3*Number(h.debug.scale)+'px');expect(caption.style.top).toBe(4*Number(h.debug.scale)+'px');
  });
  function liveFields(layout: FixtureLayout): void {
    layout.nodes.push(
      {id:'n_1',kind:'field',rect:[10,60,30,20],field:{kind:'toggle',name:'sound'},input:true},
      {id:'n_2',kind:'field',rect:[45,60,140,20],field:{kind:'slider',name:'volume',min:0,max:10,step:2},input:4},
      {id:'n_3',kind:'field',rect:[10,90,120,20],field:{kind:'dropdown',name:'mode',options:[{value:'a',label:'A'},{value:'b',label:'B'}]},input:0},
      {id:'n_4',kind:'field',rect:[10,120,200,20],field:{kind:'input',name:'name',placeholder:'Name'},input:'Alex'},
    );
  }
  function field(h: ReturnType<typeof harness>,id:string):Element { return h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']===id)!; }
  it('updates a toggle immediately and forwards only that live value',()=>{
    const h=harness(true,'div',false,false,false,liveFields);h.flush();
    field(h,'n_1').dispatchEvent(new Event('mousedown'));
    expect(field(h,'n_1').attrs['aria-checked']).toBe('false');h.flush();
    expect(h.packets).toMatchObject([{session:1,sequence:1,id:'n_1',value:false}]);expect(h.calls()).toBe(0);
  });
  it.each([
    ['modern Event', true, true, true, true],
    ['legacy Event', false, true, true, true],
    ['MouseEvent constructor', false, false, true, true],
    ['legacy MouseEvent', false, false, false, true],
  ] as const)('forwards all live fields through %s when HTMLEvents returns null', (_name, constructor, legacy, mouseConstructor, legacyMouse) => {
    const h=harness(true,'div',false,false,false,liveFields);h.flush();
    Object.assign(h.eventSupport,{constructor,legacy,mouseConstructor,legacyMouse});
    expect(h.document.createEvent('HTMLEvents')).toBeNull();
    field(h,'n_1').dispatchEvent(new Event('mousedown'));h.flush();
    field(h,'n_2').focus();h.key('ArrowRight');h.elapse(50);h.flush();
    field(h,'n_3').dispatchEvent(new Event('mousedown'));
    h.body.querySelectorAll('').filter(node=>node.attrs.role==='option')[1].dispatchEvent(new Event('mousedown'));h.flush();
    const input=field(h,'n_4').children[0];input.value='Alexandra';input.dispatchEvent(new Event('input'));h.elapse(120);h.flush();
    expect(h.packets).toEqual([
      {session:1,sequence:1,id:'n_1',value:false}, {session:1,sequence:2,id:'n_2',value:6},
      {session:1,sequence:3,id:'n_3',value:1}, {session:1,sequence:4,id:'n_4',value:'Alexandra'},
    ]);
    expect(h.nativeEvents).toEqual(Array(4).fill('core-ore-field-change'));
    expect(h.debug.status).toBe('active');expect(h.calls()).toBe(0);
  });
  it('fails closed without replaying a field edit when event creation is unavailable', () => {
    const h=harness(true,'div',false,false,false,liveFields);h.flush();
    Object.assign(h.eventSupport,{constructor:false,legacy:false,mouseConstructor:false,legacyMouse:false});
    field(h,'n_1').dispatchEvent(new Event('mousedown'));h.flush();
    expect(h.debug.status).toBe('failed');expect(h.debug.error).toContain('Native field event unavailable: core-ore-field-change');
    expect(h.frame.style.visibility).toBe('hidden');h.advance();h.flush();
    expect(h.packets).toHaveLength(0);expect(h.nativeEvents).toHaveLength(0);expect(h.calls()).toBe(0);
  });
  it('keeps the native callback inert for ordinary DOM events, unmarked inputs and mismatched sessions', () => {
    const h=harness(true,'div',false,false,false,liveFields);h.flush();
    h.mailboxInput.value=JSON.stringify({session:1,sequence:1,id:'n_1',value:false});
    h.mailboxInput.dispatchEvent(new Event('input'));h.mailboxInput.dispatchEvent(new Event('change'));
    h.mailboxInput.dispatchEvent(new Event('core-ore-field-change'));expect(h.packets).toHaveLength(0);
    h.mailboxInput.setAttribute('data-core-ore-input-session','2');h.mailboxInput.dispatchEvent(new Event('core-ore-field-change'));expect(h.packets).toHaveLength(0);
    h.mailboxInput.value='invalid JSON';h.mailboxInput.dispatchEvent(new Event('core-ore-field-change'));expect(h.packets).toHaveLength(0);
    h.unbindNativeInput();expect(h.mailboxInput.hasAttribute('data-core-ore-field-bridge')).toBe(false);
    h.mailboxInput.setAttribute('data-core-ore-input-session','1');h.mailboxInput.value=JSON.stringify({session:1});
    h.mailboxInput.dispatchEvent(new Event('core-ore-field-change'));expect(h.packets).toHaveLength(0);
  });
  it('reports a missing native callback adapter before writing or sending a field packet', () => {
    const h=harness(true,'div',false,false,false,liveFields);h.flush();h.unbindNativeInput();
    field(h,'n_1').dispatchEvent(new Event('mousedown'));h.flush();
    expect(h.debug.error).toContain('Native field callback adapter missing');expect(h.debug.status).toBe('failed');
    expect(h.mailboxInput.value).toBe('');expect(h.packets).toHaveLength(0);
  });
  it('coalesces typing and preserves standard editing keys without Enter submitting anything',()=>{
    const h=harness(true,'div',false,false,false,liveFields);h.flush();
    const input=field(h,'n_4').children[0];input.focus();
    for(const value of ['A','Al','Alice']){input.value=value;input.dispatchEvent(new Event('input'));}
    h.elapse(119);h.flush();expect(h.packets).toHaveLength(0);h.elapse(1);h.flush();
    expect(h.packets).toMatchObject([{id:'n_4',value:'Alice'}]);expect(input.value).toBe('Alice');
    const arrow=new Event('keydown',{key:'ArrowLeft'});h.document.dispatchEvent(arrow);expect(arrow.defaultPrevented).toBe(false);
    h.key('Enter');h.key('Enter','keyup');expect(h.calls()).toBe(0);expect(h.packets).toHaveLength(1);
  });
  it('keeps newer typing visible while an older edit waits for acknowledgement',()=>{
    const h=harness(false,'div',false,false,false,liveFields);h.flush();
    const input=field(h,'n_4').children[0];input.value='First';input.dispatchEvent(new Event('input'));h.elapse(120);h.flush();
    input.value='Latest';input.dispatchEvent(new Event('input'));h.elapse(120);h.flush();
    expect(input.disabled).toBe(false);expect(input.value).toBe('Latest');expect(h.packets).toHaveLength(1);
    h.acknowledgeField('Server normalized');h.flush();expect(input.value).toBe('Latest');expect(h.packets).toHaveLength(2);
    expect(h.packets[1]).toMatchObject({sequence:2,value:'Latest'});h.acknowledgeField();h.flush();expect(input.value).toBe('Latest');
  });
  it('applies server updates without echoing them as client edits and reconciles rejected values',()=>{
    const h=harness(false,'div',false,false,false,liveFields);h.flush();
    const input=field(h,'n_4').children[0];h.serverField('name','Server');h.flush();expect(input.value).toBe('Server');expect(h.packets).toHaveLength(0);
    input.value='Rejected';input.dispatchEvent(new Event('input'));h.elapse(120);h.flush();h.acknowledgeField('Server');h.flush();
    expect(input.value).toBe('Server');expect(h.packets).toHaveLength(1);
  });
  it('coalesces slider repeats and forwards dropdown selection without a button action',()=>{
    const h=harness(true,'div',false,false,false,liveFields);h.flush();
    field(h,'n_2').focus();h.key('ArrowRight');h.key('End');expect(field(h,'n_2').attrs['aria-valuenow']).toBe('10');
    h.elapse(50);h.flush();expect(h.packets).toMatchObject([{id:'n_2',value:10}]);
    field(h,'n_3').dispatchEvent(new Event('mousedown'));
    h.body.querySelectorAll('').filter(node=>node.attrs.role==='option')[1].dispatchEvent(new Event('mousedown'));h.flush();
    expect(field(h,'n_3').children[0].textContent).toBe('B');expect(h.packets[1]).toMatchObject({id:'n_3',value:1});expect(h.calls()).toBe(0);
  });
  it('renders crisp overlapping dropdown faces with explicit option typography and independent hover state', () => {
    const h=harness(true,'div',false,false,false,layout=>{
      liveFields(layout);const dropdown=layout.nodes.find(node=>node.id==='n_3')!.field!;
      Object.assign(dropdown,{popupHeight:37,surfaces:{optionBackground:'pack://textures/ui/demo/base.png',optionHover:'pack://textures/ui/demo/hover.png',optionSelected:'pack://textures/ui/demo/pressed.png'},options:[
        {value:'a',label:'A',style:{font:'MinecraftTen',scale:1.25,align:'right',color:[1,0,0],colorSelected:[0,1,0]}},
        {value:'b',label:'B',style:{font:'default',scale:1,align:'left'}},
      ]});
    });h.flush();field(h,'n_3').dispatchEvent(new Event('mousedown'));
    const popup=h.body.querySelectorAll('').find(node=>node.attrs.role==='listbox')!,rows=h.body.querySelectorAll('').filter(node=>node.attrs.role==='option');
    const scale=h.debug.scale as number;
    expect(popup.style.cssText).toContain('box-sizing:border-box');expect(popup.style.width).toBe(120*scale+'px');
    expect(rows[0].style.cssText).toContain('height:'+18*scale+'px');expect(rows[1].style.cssText).toContain('top:'+17*scale+'px');
    expect(rows[0].children[0].style.imageRendering).toBe('pixelated');
    expect(rows[0].children[1].style.cssText).toContain('flex-direction:row');expect(rows[0].children[1].style.cssText).toContain('justify-content:flex-end');
    expect(rows[0].children[1].style.cssText).toContain('CoreOreMinecraftTen');expect(rows[0].children[1].style.color).toBe('rgb(0,255,0)');
    rows[0].dispatchEvent(new Event('mouseenter'));expect(rows[0].children[0].style.borderImageSource).toContain('hover.png');
    rows[0].dispatchEvent(new Event('mouseleave'));expect(rows[0].children[0].style.borderImageSource).toContain('pressed.png');
    expect(rows[1].children[1].style.cssText).toContain('justify-content:flex-start');
    rows[1].dispatchEvent(new Event('mousedown'));h.flush();expect(h.packets).toMatchObject([{id:'n_3',value:1}]);
  });
  it('keeps a long dropdown inside the viewport and bounds its local wheel scroll', () => {
    const h=harness(true,'div',false,false,false,layout=>{liveFields(layout);Object.assign(layout.nodes.find(node=>node.id==='n_3')!.field!,{popupHeight:300,options:Array.from({length:32},(_,index)=>({value:String(index),label:String(index)}))});});
    h.flush();h.window.innerHeight=150;h.window.innerWidth=250;field(h,'n_3').dispatchEvent(new Event('mousedown'));
    const popup=h.body.querySelectorAll('').find(node=>node.attrs.role==='listbox')!,canvas=popup.parentNode!,viewport=popup.children[1],list=viewport.children[0];
    expect(parseFloat(popup.style.top as string)+parseFloat(canvas.style.top as string)).toBeGreaterThanOrEqual(12);
    expect(parseFloat(popup.style.left as string)+parseFloat(canvas.style.left as string)).toBeGreaterThanOrEqual(12);
    expect(parseFloat(popup.style.height as string)).toBeLessThanOrEqual(126);expect(parseFloat(popup.style.width as string)).toBeLessThanOrEqual(226);
    popup.dispatchEvent(new Event('wheel',{deltaY:100000}));expect(parseFloat(list.style.top as string)).toBe(-(32*17+1)*(h.debug.scale as number)+126-2*(h.debug.scale as number));
    popup.dispatchEvent(new Event('wheel',{deltaY:-100000}));expect(list.style.top).toBe('0px');expect(h.packets).toHaveLength(0);
    h.window.innerHeight=350;h.publish();h.flush();
    const resized=h.body.querySelectorAll('').find(node=>node.attrs.role==='listbox')!;
    expect(resized).not.toBe(popup);expect(resized.attrs['data-core-ore-geometry']).toContain('|250|350');expect(h.packets).toHaveLength(0);
  });
  it('flushes queued edits before an ordinary button and prevents duplicate dispatch',()=>{
    const h=harness(false,'div',false,false,false,liveFields);h.flush();
    const input=field(h,'n_4').children[0];input.value='Before details';input.dispatchEvent(new Event('input'));
    h.button().dispatchEvent(new Event('mousedown'));h.button().dispatchEvent(new Event('mousedown'));
    expect(h.packets).toHaveLength(1);expect(h.calls()).toBe(0);h.acknowledgeField();h.flush();expect(h.calls()).toBe(1);
  });
  it('waits for composition completion and discards queued edits when the screen closes',()=>{
    const h=harness(true,'div',false,false,false,liveFields);h.flush();const input=field(h,'n_4').children[0];input.focus();
    input.dispatchEvent(new Event('compositionstart'));input.value='??';input.dispatchEvent(new Event('input'));h.elapse(200);h.flush();
    h.key('Enter');expect(h.packets).toHaveLength(0);input.dispatchEvent(new Event('compositionend'));h.flush();expect(h.packets).toHaveLength(1);
    input.value='Unsent';input.dispatchEvent(new Event('input'));h.close();h.elapse(200);h.flush();expect(h.packets).toHaveLength(1);
    h.reopen();h.flush();expect(field(h,'n_4').children[0].value).toBe('??');
  });
  it('uses client-resolved native translations and updates them without a new state revision', () => {
    const h=harness(true,'div',false,false,false,layout=>{layout.nodes[2].localize=true;});h.flush();
    const translated=new Element();translated.textContent='CORE_ORE_TEXT:1:n_0_0_0 | Guardar';h.nativeContent.appendChild(translated);h.scan();
    const caption=field(h,'n_0_0_0').children[0];expect(caption.textContent).toBe('Guardar');
    translated.textContent='CORE_ORE_TEXT:1:n_0_0_0 | ??';h.scan();expect(caption.textContent).toBe('??');
  });
  function scrolling(layout: FixtureLayout): void {
    layout.nodes.splice(1, 0,
      {id:'n_1',kind:'scroll',rect:[10,20,100,40],scroll:{id:1,viewport:[10,20,100,40],extent:180}},
      {id:'n_2',kind:'scroll',rect:[120,20,100,40],scroll:{id:2,viewport:[120,20,100,40],extent:240}},
    );
    layout.nodes.find(node=>node.kind==='button')!.region=1;
    layout.nodes.find(node=>node.kind==='button')!.rect=[0,120,80,20];
    layout.nodes.find(node=>node.kind==='text')!.region=1;
    layout.nodes.find(node=>node.kind==='text')!.rect=[0,120,80,20];
  }
  it('clips independent regions and handles wheel scrolling locally with bounded offsets', () => {
    const h=harness(true,'div',false,false,false,scrolling); h.flush();
    const pane=(id:string) => h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']===id)!;
    expect(pane('n_1').children[0].style.cssText).toContain('overflow:hidden');
    expect(h.button().parentNode).toBe(pane('n_1').children[0].children[0]);
    pane('n_1').dispatchEvent(new Event('wheel',{deltaY:60}));
    expect(h.debug.scrolls).toEqual({1:20,2:0}); expect(h.calls()).toBe(0);
    pane('n_2').dispatchEvent(new Event('wheel',{deltaY:2,deltaMode:1}));
    expect(h.debug.scrolls).toEqual({1:20,2:24});
    pane('n_1').dispatchEvent(new Event('wheel',{deltaY:100000}));
    expect(h.debug.scrolls).toEqual({1:140,2:24});
    pane('n_1').dispatchEvent(new Event('wheel',{deltaY:-100000}));
    expect(h.debug.scrolls).toEqual({1:0,2:24}); expect(h.calls()).toBe(0);
  });
  it('supports pane keyboard scrolling and reveals an offscreen focused button', () => {
    const h=harness(true,'div',false,false,false,scrolling); h.flush();
    expect(h.debug.focused).toBe('n_1');
    h.key('End'); expect(h.debug.scrolls).toEqual({1:140,2:0});
    h.key('Home'); h.key('PageDown'); expect(h.debug.scrolls).toEqual({1:32,2:0});
    h.key('PageUp'); expect(h.debug.scrolls).toEqual({1:0,2:0});
    h.key('Tab'); expect(h.debug.focused).toBe('n_2');
    h.key('Tab'); expect(h.debug.focused).toBe('n_0_0'); expect(h.debug.scrolls).toEqual({1:100,2:0});
    h.key('Enter'); h.flush(); expect(h.calls()).toBe(1);
  });
  it('restores per-screen offsets through navigation and clears them on dismissal', () => {
    const h=harness(true,'div',false,false,false,scrolling); h.flush();
    h.key('PageDown'); expect(h.debug.scrolls).toEqual({1:32,2:0});
    h.navigate('details'); h.flush(); expect(h.debug.scrolls).toEqual({1:0,2:0});
    h.navigate('demo'); h.flush(); expect(h.debug.scrolls).toEqual({1:32,2:0});
    h.close(); h.reopen(); h.flush(); expect(h.debug.scrolls).toEqual({1:0,2:0});
  });
  it('scrollbar drag affects only its own region and ends on mouseup', () => {
    const h=harness(true,'div',false,false,false,scrolling); h.flush();
    const pane=h.body.querySelectorAll('').find(node=>node.attrs['data-core-ore-id']==='n_1')!;
    pane.children[1].children[0].dispatchEvent(new Event('mousedown',{clientY:145,bubbles:true}));
    h.document.dispatchEvent(new Event('mousemove',{clientY:205}));
    expect(h.debug.scrolls).toEqual({1:100,2:0});
    h.document.dispatchEvent(new Event('mouseup'));
    h.document.dispatchEvent(new Event('mousemove',{clientY:225}));
    expect(h.debug.scrolls).toEqual({1:100,2:0}); expect(h.calls()).toBe(0);
  });
  it('loads a pack PNG and preserves the solved image/caption row', () => {
    const h = harness(true, 'div', false, false, true); h.flush();
    const image = h.body.querySelectorAll('img')[0];
    const caption = h.body.querySelectorAll('').find(node => node.attrs['data-core-ore-id'] === 'n_0_0_0')!;
    expect(image.getAttribute('src')).toBe('pack://textures/ui/demo/icon.png');
    expect(caption.style.left).toBe('102px');
    expect(caption.style.width).toBe('510px');
    expect(caption.style.height).toBe('60px');
    image.dispatchEvent(new Event('load'));
    expect(h.debug.imagesExpected).toBe(5); expect(h.debug.imagesLoaded).toBe(1);
    h.button().dispatchEvent(new Event('mousedown')); h.flush(); expect(h.calls()).toBe(1);
  });
  it('fails closed when a current image fails and ignores an old image error', () => {
    const h = harness(true, 'div', false, false, true); h.flush();
    const old = h.body.querySelectorAll('img')[0];
    h.navigate('details'); h.flush();
    old.dispatchEvent(new Event('error')); expect(h.debug.status).toBe('active');
    h.body.querySelectorAll('img')[0].dispatchEvent(new Event('error'));
    expect(h.debug.status).toBe('failed');
    expect(h.frame.style.visibility).toBe('hidden'); expect(h.debug.error).toContain('Image loading failed');
  });
  it('supports the legacy MouseEvents factory without sending extra actions', () => {
    const h = harness(true, 'fast-div', true, true); h.scan(); h.scan();
    expect(h.debug.status).toBe('active');
    h.button().dispatchEvent(new Event('mousedown')); h.scan();
    expect(h.calls()).toBe(1); expect(h.targets).toEqual(['button', 'button']);
  });
  it('dispatches to the actionable control inside identical-text wrappers', () => {
    const h = harness(true, 'fast-div', true); h.scan(); h.scan();
    expect(h.debug.status).toBe('active');
    h.button().dispatchEvent(new Event('mousedown')); h.scan();
    expect(h.calls()).toBe(1);
    expect(h.targets).toEqual(['button', 'button']);
  });
  it('finds state and actions rendered through custom Gameface elements', () => {
    const h = harness(true, 'fast-div'); h.scan(); h.scan();
    expect(h.debug.status).toBe('active');
    h.button().dispatchEvent(new Event('mousedown')); h.scan();
    expect(h.calls()).toBe(1); expect(h.debug.ack).toBe(2);
  });
  it('conceals only the identified form and gates actions on readiness acknowledgement', () => {
    const h = harness(); h.scan();
    expect(h.frame.style.visibility).toBe('hidden');
    expect(h.nativeContent.style.visibility).toBeUndefined();
    h.button().dispatchEvent(new Event('mousedown')); expect(h.calls()).toBe(0);
    h.scan();
    expect(h.debug.status).toBe('active'); expect(h.frame.style.visibility).toBe('hidden');
    expect(h.root.style.visibility).toBeUndefined();
    h.button().dispatchEvent(new Event('mousedown')); h.button().dispatchEvent(new Event('mousedown'));
    expect(h.calls()).toBe(1);
    h.scan(); expect(h.debug.ack).toBe(2); expect(h.debug.pending).toBeNull();
    h.close(); expect(h.frame.style.visibility).toBeUndefined();
    expect(h.body.querySelectorAll('').some(node => node.id === 'core-ore-presentation')).toBe(false);
  });
  it('does not mistake revision changes for acknowledgements or retry a timed-out action', () => {
    const h = harness(false); h.scan(); h.scan();
    h.button().dispatchEvent(new Event('mousedown')); h.scan();
    expect(h.debug.pending).toBe('n_0_0');
    h.button().dispatchEvent(new Event('mousedown')); expect(h.calls()).toBe(1);
    h.advance(); expect(h.debug.status).toBe('failed');
    expect(h.frame.style.visibility).toBe('hidden'); expect(h.calls()).toBe(1);
  });
  it('opens a fresh custom view after a failed screen closes', () => {
    const h = harness(false); h.scan(); h.scan();
    h.button().dispatchEvent(new Event('mousedown')); h.advance();
    expect(h.debug.status).toBe('failed');
    h.close(); h.reopen(); h.scan(); h.scan();
    expect(h.debug.session).toBe(2); expect(h.debug.status).toBe('active');
    expect(h.frame.style.visibility).toBe('hidden');
  });
  it('updates through root mutations without waiting for the periodic fallback', () => {
    const h = harness(); h.flush();
    expect(h.observed()).toBe(h.root); expect(h.debug.status).toBe('active');
    h.button().dispatchEvent(new Event('mousedown')); h.flush();
    expect(h.debug.pending).toBeNull(); expect(h.calls()).toBe(1);
    expect(h.debug.lastAckMs).toBe(0);
    const paints = h.debug.paints; h.scan(); h.scan(); expect(h.debug.paints).toBe(paints);
  });
  it('uses integer scaling and provides the declared pointer and keyboard state faces', () => {
    const h = harness(); h.flush();
    expect(h.debug.scale).toBe(3);
    expect(h.button().getAttribute('data-core-ore-focus')).toBe('true');
    expect(h.button().style.borderImageSource).toContain('/base.png');
    expect(h.button().style.borderImageSlice).toBe('2 2 4 2 fill');
    expect(h.button().style.borderImageWidth).toBe('6px 6px 12px 6px');
    h.button().dispatchEvent(new Event('mouseenter')); expect(h.button().style.borderImageSource).toContain('/hover.png');
    h.key('Enter'); h.key('Enter', 'keydown', true); h.flush(); expect(h.calls()).toBe(1);
    h.key('Enter', 'keyup'); h.key(' '); h.flush(); expect(h.calls()).toBe(2);
    h.key(' ', 'keyup'); h.key('Tab'); expect(h.debug.focused).toBe('n_0_0');
    h.key('Tab', 'keydown', false, true); expect(h.debug.focused).toBe('n_0_0');
  });
  it('preserves transparent panels, source caption rectangles and a one-texture button in every state', () => {
    const h = harness(true, 'div', false, false, false, layout => {
      layout.nodes[1].backgrounds = {normal:'pack://textures/ui/demo/base.png'};
    }); h.flush();
    const panel = h.body.querySelectorAll('').find(node => node.attrs['data-core-ore-id'] === 'n_0')!;
    const text = h.body.querySelectorAll('').find(node => node.attrs['data-core-ore-id'] === 'n_0_0_0')!;
    expect(panel.style.background).toBe('transparent');
    expect(panel.style.border).toBe('0px solid transparent');
    expect(text.style.width).toBe('540px');
    expect(text.children[0].style.cssText).toContain('CoreOreMojangles');
    h.button().dispatchEvent(new Event('mouseenter'));
    expect(h.button().style.borderImageSource).toContain('/base.png');
    h.button().dispatchEvent(new Event('mousedown'));
    expect(h.button().style.borderImageSource).toContain('/base.png');
    h.availability(false); h.flush();
    expect(h.button().style.borderImageSource).toContain('/base.png');
    expect(h.button().style.opacity).toBe('1');
  });
  it('centers content bounds and allows an explicit GUI-scale calibration without exceeding the viewport', () => {
    const h = harness(true, 'div', false, false, false, layout => { layout.view = {bounds:[0,0,300,210],uiScale:5}; });
    h.window.innerWidth = 2559; h.window.innerHeight = 1439; h.flush();
    const canvas = h.button().parentElement!;
    expect(h.debug.scale).toBe(5); expect(canvas.style.left).toBe('529.5px'); expect(canvas.style.top).toBe('194.5px');
    h.window.innerWidth = 200; h.window.innerHeight = 150; h.scan();
    expect(Number(h.debug.scale)).toBeLessThan(1);
  });
  it('fails closed for an unresolved or invalid texture descriptor', () => {
    const h = harness(true, 'div', false, false, false, layout => { delete layout.textures['pack://textures/ui/demo/base.png']; });
    h.flush(); expect(h.debug.status).toBe('failed'); expect(h.frame.style.visibility).toBe('hidden');
  });
  it('holds presentation across a short action handoff and retains its pack layout', () => {
    const h = harness(false); h.flush();
    const presentation = h.body.querySelectorAll('').find(node => node.id === 'core-ore-presentation');
    h.button().dispatchEvent(new Event('mousedown')); h.removeCarrier(); h.flush();
    expect(h.debug.status).toBe('switching screen');
    expect(h.body.querySelectorAll('')).toContain(presentation);
    h.elapse(100); h.restoreCarrier(); h.flush();
    expect(h.debug.layoutRequests).toBe(1);
    h.close(); h.reopen(); h.flush(); expect(h.debug.layoutRequests).toBe(1);
  });
  it('releases presentation after dismissal and keeps failed transports concealed', () => {
    const h = harness(false); h.flush();
    h.key('Escape'); h.close();
    expect(h.body.querySelectorAll('').some(node => node.id === 'core-ore-presentation')).toBe(false);
    h.reopen(); h.flush(); h.button().dispatchEvent(new Event('mousedown')); h.advance();
    expect(h.debug.status).toBe('failed'); expect(h.frame.style.visibility).toBe('hidden');
  });
  it('ignores disabled or hidden controls and keeps focus on available actions', () => {
    const h = harness(); h.flush(); h.availability(false); h.flush();
    expect(h.debug.focused).toBeNull(); expect(h.button().tabIndex).toBe(-1);
    h.button().dispatchEvent(new Event('mousedown')); expect(h.calls()).toBe(0);
    h.availability(true, false); h.flush();
    h.button().dispatchEvent(new Event('mousedown')); expect(h.calls()).toBe(0);
    h.availability(true); h.flush(); h.key('TAB', 'keydown', false, true);
    expect(h.debug.focused).toBe('n_0_0');
  });
  it('deduplicates handled keys and normalizes native key spellings', () => {
    const h = harness(); h.flush();
    const event = new Event('keydown', { key: 'ENTER', bubbles: true });
    h.button().dispatchEvent(event); h.document.dispatchEvent(event); h.flush();
    expect(h.calls()).toBe(1);
    h.key('ENTER', 'keyup'); h.key('Space'); h.flush(); expect(h.calls()).toBe(2);
  });
  it('restores navigation focus and cached layouts while clearing focus on dismissal', () => {
    const h = harness(true,'div',false,false,false,layout=>{layout.nodes.push({id:'n_1',kind:'button',rect:[10,60,200,30]});}); h.flush(); h.key('Tab');
    expect(h.debug.focused).toBe('n_1');
    h.navigate('details'); h.flush(); expect(h.debug.focused).toBe('n_0_0');
    h.navigate('demo'); h.flush(); expect(h.debug.focused).toBe('n_1');
    expect(h.debug.layoutRequests).toBe(2);
    h.close(); h.reopen(); h.flush(); expect(h.debug.focused).toBe('n_0_0');
  });
  it('does not activate a destination again while its navigation key is still held', () => {
    const h = harness(); h.flush(); h.key('Enter'); h.flush(); expect(h.calls()).toBe(1);
    h.navigate('details'); h.flush();
    h.key('Enter'); h.flush(); expect(h.calls()).toBe(1);
    h.key('Enter', 'keyup'); h.key('Enter'); h.flush(); expect(h.calls()).toBe(2);
  });
  it('keeps a confirmed native transport concealed across destinations without another handshake', () => {
    const h = harness(); h.flush(); const readinessCalls = h.targets.length;
    h.navigate('details'); h.flush();
    expect(h.frame.style.visibility).toBe('hidden'); expect(h.targets).toHaveLength(readinessCalls);
    expect(h.debug.status).toBe('active'); expect(h.debug.transport).toBe(7);
    h.navigate('demo'); h.flush(); expect(h.targets).toHaveLength(readinessCalls);
  });
  it('keeps the pointer and normal opacity during short acknowledgements', () => {
    const h = harness(false); h.flush();
    h.button().dispatchEvent(new Event('mousedown')); h.button().dispatchEvent(new Event('mouseup'));
    expect(h.button().style.cursor).toBe('pointer'); expect(h.button().style.opacity).toBe('1');
    h.elapse(133); h.scan(); expect(h.button().style.cursor).toBe('pointer');
    h.elapse(100); h.flush(); h.scan();
    expect(h.button().getAttribute('aria-busy')).toBe('true');
    expect(h.button().style.cursor).toBe('progress'); expect(h.button().style.opacity).toBe('0.85');
    h.advance(); expect(h.debug.status).toBe('failed');
  });
  it('has no native restore action and closes a failed transport once without exposing it', () => {
    const h=harness(false);h.flush();expect(h.body.textContent).not.toContain('Restore native UI');
    h.button().dispatchEvent(new Event('mousedown'));h.advance();h.scan();h.flush();
    expect(h.debug.status).toBe('failed');expect(h.closeCalls()).toBe(1);expect(h.calls()).toBe(1);
    expect(h.frame.style.visibility).toBe('hidden');expect(h.debug.closeRequested).toBe(true);
    h.close();h.flush();expect(h.body.textContent).toContain('Experimental UI failed');
  });
});
