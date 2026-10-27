import { expect, it } from 'vitest';
import { ORE_LIMIT, ORE_STATE_PREFIX, oreStateFrame, type OreLayout, type OreState } from '../contract';

const value={id:'n_0',text:'baseline',visible:true,enabled:true};
const layout:OreLayout={schema:'core-ore-layout/1',screen:'frame',asset:'/hbui/core-ore/frame.json',title:'Frame',canvas:{width:320,height:210},nodes:[{id:value.id,kind:'text',rect:[0,0,200,20],initial:value}]};
const state=(text:string):OreState=>({schema:'core-ore-state/1',screen:layout.screen,asset:layout.asset,title:layout.title,session:1,transport:2,revision:3,ack:1,values:[{...value,text}]});

it('splits changed values into bounded labels without breaking Unicode or spaces',()=>{
  const original=state(('text '.repeat(1200)+'😀').repeat(3));const frame=oreStateFrame(original,layout);
  const header=JSON.parse(frame.carrier.slice(ORE_STATE_PREFIX.length));
  expect(header.parts).toBe(frame.parts.length);expect(frame.parts.length).toBeGreaterThan(1);
  expect(frame.parts.every(part=>part.length<=ORE_LIMIT)).toBe(true);
  const joined=frame.parts.map(part=>part.slice(part.indexOf('|')+1)).join('');
  expect(JSON.parse(joined.slice(ORE_STATE_PREFIX.length))).toEqual(original);
  for(const part of frame.parts){const last=part.charCodeAt(part.length-1);expect(last<0xd800||last>0xdbff).toBe(true);}
});
it('compacts a large unchanged scene against its pack baseline',()=>{
  const initial={...value,text:'x'.repeat(10000)},large={...layout,nodes:[{...layout.nodes[0],initial}]};
  const frame=oreStateFrame(state(initial.text),large);
  expect(frame.parts).toEqual([]);expect(JSON.parse(frame.carrier.slice(ORE_STATE_PREFIX.length)).values).toEqual([]);
});
it('rejects updates beyond the bounded complete-frame capacity',()=>{
  expect(()=>oreStateFrame(state('x'.repeat(400000)),layout)).toThrow(/observable parts/);
});
