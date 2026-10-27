import { afterEach, describe, expect, it } from 'vitest';
import { Script } from 'node:vm';
import { Button, Experimental_OreUI, Image, Panel, Screen, Scroll, Text, Trans, Toggle, Slider, Dropdown, Input, Option, Form } from '@bedrock-core/ui-runtime';
import { setBuildLocales } from '@bedrock-core/ui-runtime/compile';
import type { JSX } from '@bedrock-core/ui-runtime';
import { compileExperimentalOreScreen } from '../compile';
import { ORE_CLIENT_SOURCE } from '../client';
import { buildUiPack } from '../../../pack';

function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- component fixture factory
  return { type, props } as JSX.Element;
}
const Page = (): JSX.Element => el(Experimental_OreUI, { title: 'Ore compiler test', children: el(Panel, { width: 200, height: 120, children: [
  el(Text, { width: 180, height: 20, scale: 1.25, textAlign: 'right', color: [0.5, 0.75, 1], children: 'State' }),
  el(Button, { width: 180, height: 30, children: el(Text, { width: 160, height: 20, children: 'Action' }) }),
] }) });

describe('experimental Ore compilation', () => {
  afterEach(()=>setBuildLocales(undefined));
  it('compiles shared form fields and their original skin geometry without serializing callbacks',()=>{
    const Page=():JSX.Element=>el(Experimental_OreUI,{children:el(Panel,{width:220,height:180,children:[
      el(Toggle,{name:'sound',width:100,height:20,checkedBackground:'textures/ui/checked'}),
      el(Slider,{name:'volume',min:0,max:10,step:2,defaultValue:4,width:100,height:20,thumbWidth:12,thumbHeight:14}),
      el(Dropdown,{name:'mode',width:100,height:20,children:[el(Option,{value:'a',label:'A'}),el(Option,{value:'b',label:'B'})]}),
      el(Input,{width:100,height:20}),el(Button,{width:100,height:20}),
    ]})});
    const {ore}=compileExperimentalOreScreen(Page,{namespace:'test',name:'fields'});
    expect(ore.nodes.filter(node=>node.kind==='field').map(node=>node.field!.kind)).toEqual(['toggle','slider','dropdown','input']);
    expect(ore.nodes.find(node=>node.field?.kind==='toggle')!.field!.surfaces!.checkedBackground).toBe('pack://textures/ui/checked.png');
    expect(ore.nodes.find(node=>node.field?.kind==='slider')!.field).toMatchObject({thumbWidth:12,thumbHeight:14,step:2});
    expect(ore.nodes.filter(node=>node.kind==='button')).toHaveLength(1);expect(JSON.stringify(ore)).not.toContain('onSubmit');
    expect(()=>compileExperimentalOreScreen(()=>el(Experimental_OreUI,{children:el(Form.Button,{type:'submit'})}),{namespace:'test',name:'no_form'})).toThrow(/not supported/);
  });
  it('emits translated Trans pieces, flow ownership and replay records alongside RawMessage support',()=>{
    setBuildLocales({defaultLocale:'en_US',tables:{en_US:{greeting:'Hello'},es_ES:{greeting:'Hola'}}});
    const Page=():JSX.Element=>el(Experimental_OreUI,{children:el(Panel,{width:220,height:100,children:[
      el(Text,{width:200,height:20,children:{translate:'greeting',with:['Alex']}}),
      el(Trans,{width:200,height:30,translations:{en_US:'Hello <accent>friend</accent>',es_ES:'Hola <accent>amigo</accent>'},components:{accent:el(Text,{color:[1,0,0]})}}),
    ]})});
    const compiled=compileExperimentalOreScreen(Page,{namespace:'test',name:'locales'});
    expect(compiled.snapshot.trans).toHaveLength(1);expect(compiled.ore.nodes.filter(node=>node.localize).length).toBeGreaterThan(1);
    expect(Object.values(compiled.lang.es_ES).join(' ')).toContain('amigo');expect(compiled.ore.nodes.some(node=>node.flow?.hug)).toBe(true);
    expect(compiled.ore.nodes.some(node=>JSON.stringify(node.textStyle?.color)==='[1,0,0]')).toBe(true);
  });
  it('retains dropdown option font, alignment, per-option faces and native popup height', () => {
    const Page=():JSX.Element=>el(Experimental_OreUI,{children:el(Dropdown,{width:180,height:20,optionFont:'minecraftTen',optionScale:1.25,optionAlign:'right',optionBackground:'textures/ui/base',optionHover:'textures/ui/hover',optionSelected:'textures/ui/selected',children:[
      el(Option,{value:'a',label:'A'}),el(Option,{value:'b',label:'B',font:'mojangles',scale:0.75,align:'left',background:'textures/ui/second',color:[1,0,0],colorSelected:[0,1,0],dropSelected:1}),
    ]})});
    const {ore}=compileExperimentalOreScreen(Page,{namespace:'test',name:'dropdown_style'});
    const dropdown=ore.nodes.find(node=>node.field?.kind==='dropdown')!.field!;
    expect(dropdown.popupHeight).toBe(37);
    expect(dropdown.options).toEqual([
      {value:'a',label:'A',style:{font:'MinecraftTen',scale:1.25,align:'right'}},
      {value:'b',label:'B',style:{font:'default',scale:0.75,align:'left',color:[1,0,0],colorSelected:[0,1,0],dropSelected:1}},
    ]);
    expect(dropdown.surfaces).toMatchObject({option0Background:'pack://textures/ui/base.png',option0Hover:'pack://textures/ui/hover.png',option0Selected:'pack://textures/ui/selected.png',option1Background:'pack://textures/ui/second.png'});
  });
  it('compiles explicit padded Scroll regions without including overflow in screen centering', () => {
    const Page=():JSX.Element=>el(Experimental_OreUI,{children:el(Panel,{width:300,height:200,children:el(Scroll,{width:100,height:50,padding:4,children:el(Panel,{width:'100%',height:400,children:el(Text,{children:'End'})})})})});
    const {ore}=compileExperimentalOreScreen(Page,{namespace:'test',name:'scroll'});
    const scroll=ore.nodes.find(node=>node.kind==='scroll')!;
    expect(scroll.scroll).toEqual({id:1,viewport:[4,4,92,42],extent:400});
    expect(ore.nodes.find(node=>node.kind==='text')!.region).toBe(1);
    expect(ore.nodes.find(node=>node.kind==='text')!.rect[0]).toBe(0);
    expect(ore.view!.bounds).toEqual([0,0,300,200]);
  });
  it('rejects nested Scroll regions and bakes long text outside the observable frame', () => {
    expect(()=>compileExperimentalOreScreen(()=>el(Experimental_OreUI,{children:el(Scroll,{width:100,height:50,children:el(Scroll,{width:50,height:20})})}),{namespace:'test',name:'nested'})).toThrow(/cannot sit inside/);
    const result=compileExperimentalOreScreen(()=>el(Experimental_OreUI,{children:el(Text,{width:100,height:20,children:'x'.repeat(5000)})}),{namespace:'test',name:'huge'});
    expect(result.ore.nodes[0].initial?.text).toHaveLength(5000);
  });
  it('links fixed geometry and the standalone client outside JSON UI definitions', () => {
    const compiled = compileExperimentalOreScreen(Page, { namespace: 'test', name: 'home' });
    const pack = buildUiPack([compiled], 'test');
    expect(compiled.kind).toBe('custom');
    expect(compiled.ore.nodes.filter(n => n.kind === 'button')).toHaveLength(1);
    expect(compiled.ore.nodes.every(n => n.rect.every(Number.isFinite))).toBe(true);
    expect(compiled.ore.nodes.find(n => n.kind === 'text' && !n.button)?.textStyle).toEqual({ scale: 1.25, align: 'right', font: 'default', shadow: false, offset: [0,0], color: [0.5, 0.75, 1] });
    const button = compiled.ore.nodes.find(n => n.kind === 'button')!;
    expect(compiled.ore.nodes.find(n => n.button === button.id)?.textStyle?.align).toBe('left');
    expect(compiled.ore.nodes.find(n => n.kind === 'panel')?.backgrounds).toBeUndefined();
    expect(button.backgrounds).toEqual({ normal: 'pack://textures/ui/unstyled.png', hover: 'pack://textures/ui/unstyled.png', pressed: 'pack://textures/ui/unstyled.png', disabled: 'pack://textures/ui/unstyled.png' });
    expect(pack.resources?.map(r => r.file)).toEqual(['hbui/core-ore-client.js', 'hbui/core-ore/test_home.json']);
    expect(pack.hooks).toEqual([]); expect(pack.documents).toEqual([]);
    expect(() => new Script(ORE_CLIENT_SOURCE)).not.toThrow();
  });
  it('preserves explicit state faces, font, offsets, shadow and content-centered bounds', () => {
    const Page = (): JSX.Element => el(Experimental_OreUI, { uiScale: 5, children: el(Panel, { width: 300, height: 210, children: el(Button, {
      width: 140, height: 24, background: 'textures/ui/base', backgroundHover: 'textures/ui/hover', backgroundPressed: 'textures/ui/pressed', backgroundLocked: 'textures/ui/locked',
      children: el(Text, { children: 'Hi', font: 'minecraftTen', shadow: true, offsetX: 1, offsetY: -2 }),
    }) }) });
    const { ore } = compileExperimentalOreScreen(Page, { namespace: 'test', name: 'styles' });
    expect(ore.view).toEqual({ bounds: [0,0,300,210], uiScale: 5 });
    expect(ore.nodes.find(node => node.kind === 'button')?.backgrounds).toEqual({ normal: 'pack://textures/ui/base.png', hover: 'pack://textures/ui/hover.png', pressed: 'pack://textures/ui/pressed.png', disabled: 'pack://textures/ui/locked.png' });
    expect(ore.nodes.find(node => node.kind === 'text')?.textStyle).toMatchObject({ font: 'MinecraftTen', shadow: true, offset: [1,-2] });
  });
  it.each([0, -1, Infinity, 17])('rejects invalid presentation scale %s', uiScale => {
    expect(() => compileExperimentalOreScreen(() => el(Experimental_OreUI, { uiScale }), { namespace: 'test', name: 'scale' })).toThrow(/uiScale/);
  });
  it('requires an explicit Ore root', () => {
    expect(() => compileExperimentalOreScreen(() => el(Screen, {}), { namespace: 'test', name: 'bad' })).toThrow(/requires <Experimental_OreUI>/);
  });
  it('keeps a static pack image beside its original button caption', () => {
    const Page = (): JSX.Element => el(Experimental_OreUI, { children: el(Button, { width: 140, height: 24, flexDirection: 'row', gap: 4, children: [
      el(Image, { width: 16, height: 16, texture: 'textures/ui/demo/icon' }),
      el(Text, { children: 'image and text' }),
    ] }) });
    const { ore } = compileExperimentalOreScreen(Page, { namespace: 'test', name: 'image' });
    const image = ore.nodes.find(node => node.kind === 'image')!;
    const text = ore.nodes.find(node => node.kind === 'text')!;
    expect(image.source).toBe('pack://textures/ui/demo/icon.png');
    expect(image.button).toBe(text.button);
    expect(text.rect[0]).toBeGreaterThanOrEqual(image.rect[0] + image.rect[2]);
  });
  it.each(['https://example.com/icon.png', '../icon', 'textures/../icon', 'textures/ui/icon.svg', 'pack://textures/ui/icon.png'])(
    'rejects a non-pack PNG path: %s', texture => {
      expect(() => compileExperimentalOreScreen(() => el(Experimental_OreUI, { children: el(Image, { width: 16, height: 16, texture }) }), { namespace: 'test', name: 'image' }))
        .toThrow(/pack-local PNG/);
    },
  );
  it('marks live images for runtime pack-local source updates', () => {
    const result=compileExperimentalOreScreen(() => el(Experimental_OreUI, { children: el(Image, { width: 16, height: 16, texture: 'textures/ui/icon', live: true }) }), { namespace: 'test', name: 'image' });
    expect(result.ore.nodes[0].live).toBe(true);expect(result.ore.nodes[0].initial?.source).toBe('pack://textures/ui/icon.png');
  });
});
