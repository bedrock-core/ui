import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import upstream from 'eslint-plugin-react-hooks';
import plugin, { ruleCoverage } from '../../eslint/index.mjs';

const runtimeFile = fileURLToPath(new URL('../../packages/ui-runtime/src/hooks/check.tsx', import.meta.url));
const hooks = "import { useState, useEffect, useRef, useReducer } from '@bedrock-core/ui';\n";
const view = body => hooks + 'function View(props) { ' + body + ' }';
const fixtures = {
  'rules-of-hooks': {
    valid: [
      view('const [value] = useState(0); return value;'),
      hooks + 'function useValue() { return useState(0); }',
      "import {useState as state} from '@bedrock-core/ui'; function View(){return state(0);}",
      "import * as core from '@bedrock-core/ui'; function View(){return core.useState(0);}",
      "import {useState as state} from '@bedrock-core/ui'; function View(state){if (true) state();}",
    ],
    invalid: [
      view('if (props.ready) useState(0);'),
      view('if (props.ready) return null; return useState(0);'),
      view('for (const value of props.values) useState(value);'),
      view('return () => useState(0);'),
      hooks + 'async function View() { return useState(0); }',
      hooks + 'function helper() { return useState(0); }',
      "import {useState as state} from '@bedrock-core/ui'; state(0);",
      "import {useState as state} from '@bedrock-core/ui'; function View(ok){if(ok) state(0);}",
      "import * as core from '@bedrock-core/ui'; function View(ok){if(ok) core.useState(0);}",
      "import * as core from '@bedrock-core/ui'; function View(ok){if(ok) core['useState'](0);}",
    ],
  },
  'component-hook-factories': {
    valid: [
      "import {createStaticNavigation} from '@bedrock-core/ui/navigation'; const Navigation=createStaticNavigation({}); function View(){return <Navigation/>;}",
      "import {createContext} from '@bedrock-core/ui'; const Context=createContext(0); function View(){return Context;}",
      hooks + 'function useValue(){return useState(0);} function View(){return useValue();}',
      'function label(value){return <Text>{value}</Text>;} function View(){return label(1);}',
      'function header(){const render=()=> <Text/>; return render();} function View(){return header();}',
    ],
    invalid: [
      view('function useValue(){return useState(0);} return useValue();'),
      "import {createContext} from '@bedrock-core/ui'; function View(){return createContext(0);}",
      "import {createStaticNavigation as create} from '@bedrock-core/ui/navigation'; function View(){return create({});}",
      "import * as nav from '@bedrock-core/navigation'; function View(){return nav.createStaticNavigation({});}",
      'function make(){function Child(){return <Text/>;} return Child;} function View(){const Child=make(); return <Child/>;}',
      'function make(){return () => {return <Text/>;};} function View(){const Child=make(); return <Child/>;}',
      hooks + 'function make(){return () => useState(0);} function View(){const useValue=make();return useValue();}',
      "import {Panel} from '@bedrock-core/ui'; function make(){return ()=>Panel({});} function View(){const Child=make();return <Child/>;}",
    ],
  },
  'static-components': {
    valid: ['function Child(){return <Text/>;} function View(){return <Child/>;}'],
    invalid: ['function View(){function Child(){return <Text/>;} return <Child/>;}'],
  },
  globals: {
    valid: [
      'let count=0; function View(){return <Button onPress={() => count++}/>;}',
      'const values=[]; ' + view('useEffect(() => {values.push(1);}, []); return null;'),
      view('const values=[]; values.push(1); return values;'),
      view('const ref=useRef(0); ref.current=props.value; return ref.current;'),
      'function helper(value){value.count++;} function View(){return <Button onPress={() => helper({count:0})}/>;}',
      'let count=0; function View(){let local=count; local++; return local;}',
      'let shared={}; function View(){let local=shared; local={}; return local;}',
    ],
    invalid: [
      'let count=0; function View(){count++; return count;}',
      'function View(){globalThis.value=1; return null;}',
      'const values=[]; function View(){values.push(1); return null;}',
      'const values=[]; function View(){const alias=values; alias.push(1); return null;}',
      'const cache={}; function View(){const alias=cache; alias.value=1; return null;}',
      'const cache={}; function View(){delete cache.value; return null;}',
      'const cache={}; function View(){Object.assign(cache,{value:1}); return null;}',
      'const cache={}; function View(){Reflect.set(cache,"value",1); return null;}',
      'const values=new Map(); function View(){values.set("a",1); return null;}',
      'let count=0; function View(){[1,2].map(() => count++); return null;}',
      'let count=0; function View(){({value:count}={value:1}); return null;}',
    ],
  },
  immutability: {
    valid: [
      view('const copy={...props}; copy.value=1; return copy;'),
      view('const [items,setItems]=useState([]); return <Button onPress={() => setItems([...items,1])}/>;'),
      view('const ref=useRef(0); ref.current=props.value; return ref.current;'),
    ],
    invalid: [
      view('props.value=1; return props.value;'),
      view('props.values.push(1); return props.values;'),
      view('const [items]=useState([]); items.push(1); return items;'),
      "import {useState as state} from '@bedrock-core/ui'; function View(){const [items]=state([]); items.push(1); return items;}",
      view('const [items]=useState([]); const alias=items; return <Button onPress={() => alias.push(1)}/>;'),
      view('const [items]=useReducer((state)=>state, []); items[0]=1; return items;'),
    ],
  },
  purity: {
    valid: [
      view('return <Button onPress={() => Math.random()}/>;'),
      view('useEffect(() => {Date.now();}, []); return null;'),
      view('const [time]=useState(() => Date.now()); return time;'),
    ],
    invalid: [view('return Math.random();'), view('return Date.now();')],
  },
  'set-state-in-render': {
    valid: [
      view('const [value,setValue]=useState(0); return <Button onPress={() => setValue(value+1)}/>;'),
      view('const [previous,setPrevious]=useState(props.value); if(previous!==props.value) setPrevious(props.value); return previous;'),
      view('const [value,dispatch]=useReducer((state)=>state+1,0); return <Button onPress={() => dispatch()}/>;'),
      "import {useState as state} from 'another-library'; function View(){const [value,setValue]=state(0); setValue(1); return value;}",
    ],
    invalid: [
      view('const [value,setValue]=useState(0); setValue(1); return value;'),
      "import {useState as state} from '@bedrock-core/ui'; function View(){const [value,setValue]=state(0); setValue(1); return value;}",
      "import * as core from '@bedrock-core/ui'; function View(){const [value,setValue]=core.useState(0); setValue(1); return value;}",
      "import * as core from '@bedrock-core/ui'; function View(){const [value,setValue]=core['useState'](0); setValue(1); return value;}",
      "import {useState} from '..'; function View(){const [value,setValue]=useState(0); setValue(1); return value;}",
      "import {useState as state} from './useState'; function View(){const [value,setValue]=state(0); setValue(1); return value;}",
      view('const [value,dispatch]=useReducer((state)=>state+1,0); dispatch(); return value;'),
    ],
  },
  'set-state-in-effect': {
    valid: [
      view('const [value,setValue]=useState(0); useEffect(() => props.source.subscribe(setValue), [props.source,setValue]); return value;'),
      view('const [value,setValue]=useState(0); useEffect(() => {const timer=setTimeout(() => setValue(1), 1); return () => clearTimeout(timer);}, [setValue]); return value;'),
      view('const [value,dispatch]=useReducer((state)=>state+1,0); useEffect(() => props.source.subscribe(dispatch), [props.source,dispatch]); return value;'),
    ],
    invalid: [
      view('const [value,setValue]=useState(0); useEffect(() => {setValue(props.value);}, [props.value,setValue]); return value;'),
      "import {useState as state,useEffect as effect} from '@bedrock-core/ui'; function View(props){const [value,setValue]=state(0); effect(() => {setValue(props.value);}, [props.value,setValue]); return value;}",
      "import * as core from '@bedrock-core/ui'; function View(props){const [value,setValue]=core.useState(0); core.useEffect(() => {setValue(props.value);}, [props.value,setValue]); return value;}",
      view('const [value,dispatch]=useReducer((state)=>state+1,0); useEffect(() => {dispatch();}, [dispatch]); return value;'),
    ],
  },
  'error-boundaries': {
    valid: ['function View(){try {return readHost();} catch {return null;}}'],
    invalid: ['function View(){try {return <Child/>;} catch {return <Text/>;}}'],
  },
};

function verify(rule, code) {
  const messages = new Linter().verify(code, [{
    files: ['**/*.tsx'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'core-hooks': plugin },
    rules: { ['core-hooks/' + rule]: 'error' },
  }], { filename: runtimeFile });

  assert.equal(messages.some(message => message.fatal), false, JSON.stringify(messages));

  return messages;
}

for (const [rule, cases] of Object.entries(fixtures)) {
  for (const [kind, examples] of Object.entries(cases)) {
    for (const [index, code] of examples.entries()) {
      test(rule + ' ' + kind + ' ' + (index + 1), () => {
        const messages = verify(rule, code);

        assert.equal(messages.length > 0, kind === 'invalid', JSON.stringify(messages) + '\n' + code);

        for (const message of messages) {
          assert.equal(message.ruleId, 'core-hooks/' + rule);
          assert.equal(message.fix, undefined);
          assert.equal(message.suggestions, undefined);
          assert.doesNotMatch(message.message, /reset their state|useCoreLint/);
        }
      });
    }
  }
}

test('coverage accounts for every upstream recommended rule and component-hook-factories', () => {
  const recommended = Object.keys(upstream.configs.recommended.rules).map(name => name.replace('react-hooks/', ''));

  assert.deepEqual(Object.keys(ruleCoverage).sort(), [...new Set([...recommended, 'component-hook-factories'])].sort());
  assert.deepEqual(Object.keys(plugin.rules).sort(), ['exhaustive-deps', ...Object.keys(fixtures)].sort());

  for (const [name, decision] of Object.entries(ruleCoverage)) {
    assert.equal(name in plugin.rules, decision.mode !== 'not-applicable');
    assert.ok(decision.reason.length > 20);
  }
});

test('compiler diagnostics retain original UTF-16 locations for short imports and aliases', () => {
  const code = "/* 😀 */ import {useState as state} from '..'; function View(){const [value,setValue]=state(0); setValue(1); return value;}";
  const [problem] = verify('set-state-in-render', code);

  assert.ok(problem);
  assert.equal(problem.line, 1);
  assert.equal(problem.column, code.indexOf('setValue(1)') + 1);
  assert.equal(problem.endColumn, code.indexOf('setValue(1)') + 'setValue'.length + 1);
  assert.doesNotMatch(problem.message, /useCoreLint|from 'react'/);
});

test('compiler normalization preserves shadowed bindings and unrelated imports', () => {
  const code = "import {useState as state} from '@bedrock-core/ui'; function View(state){const [value,setValue]=state(0); setValue(1); return value;}";

  assert.deepEqual(verify('set-state-in-render', code), []);
});

test('compiler diagnostics retain multiline locations and avoid local identifier collisions', () => {
  const code = "import {useState as state} from './useState';\nconst useCoreLint0=1;\nfunction View(){\n  const [value,setValue]=state(useCoreLint0);\n  setValue(2);\n  return value;\n}";
  const [problem] = verify('set-state-in-render', code);

  assert.ok(problem);
  assert.equal(problem.line, 5);
  assert.equal(problem.column, 3);
  assert.equal(problem.endColumn, 11);
});

test('workspace configuration enables all applicable rules and permits Core render refs', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const eslint = new ESLint({ cwd: root, overrideConfig: [tseslint.configs.disableTypeChecked] });
  const config = await eslint.calculateConfigForFile(runtimeFile);

  for (const name of Object.keys(plugin.rules)) { assert.equal(config.rules['core-hooks/' + name][0], 2); }

  assert.equal(config.rules['core-hooks/refs'], undefined);

  const [result] = await eslint.lintText(view('const ref=useRef(0); ref.current=props.value; return ref.current;'), { filePath: runtimeFile });

  assert.deepEqual(result.messages.filter(message => message.ruleId?.startsWith('core-hooks/')), []);
});
