import reactHooks from 'eslint-plugin-react-hooks';
import { importedHook, unwrap, variableAt } from './core-hooks.mjs';

const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const immediateCallbacks = new Set(['map', 'flatMap', 'filter', 'forEach', 'reduce', 'reduceRight', 'some', 'every', 'find', 'findIndex', 'sort']);
const mutators = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
const renderFactories = new Set(['createStaticNavigation', 'createContext']);
const reactContracts = new Set(['useState', 'useReducer', 'useRef', 'useEffect', 'useContext']);

function functionName(node) {
  return node.id?.name ?? (node.parent?.type === 'VariableDeclarator' ? node.parent.id.name : undefined);
}

function renderFunction(node) {
  const name = functionName(node);

  return name !== undefined && (/^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name));
}

function property(node) {
  if (node.type !== 'MemberExpression') { return undefined; }

  return node.computed ? node.property.type === 'Literal' ? node.property.value : undefined : node.property.name;
}

function renderScope(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (!functionTypes.has(parent.type)) { continue; }

    if (renderFunction(parent)) { return parent; }

    const call = parent.parent;

    if (call?.type === 'CallExpression' && (call.callee === parent || immediateCallbacks.has(property(call.callee)))) { continue; }

    return undefined;
  }

  return undefined;
}

function rootIdentifier(node) {
  node = unwrap(node);

  while (node?.type === 'MemberExpression') { node = unwrap(node.object); }

  return node?.type === 'Identifier' ? node : undefined;
}

function coreMessage(message) {
  return message.replaceAll('React Hook', '@bedrock-core hook').replaceAll('React component', '@bedrock-core component')
    .replaceAll('React function component', '@bedrock-core component').replaceAll('React Hooks', '@bedrock-core hooks');
}

function contextWith(context, sourceCode, report, options = context.options) {
  return Object.create(context, {
    sourceCode: { value: sourceCode },
    getSourceCode: { value: () => sourceCode },
    report: { value: report },
    options: { value: options },
  });
}

function compilerSource(context, ruleName) {
  const source = context.sourceCode;
  const edits = [];
  const imports = [];
  const names = new Set(source.scopeManager.scopes.flatMap(scope => scope.variables.map(variable => variable.name)));
  let insertion = 0;

  for (const statement of source.ast.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') { continue; }

    for (const specifier of statement.specifiers) {
      if (specifier.importKind === 'type') { continue; }

      const variable = variableAt(source, specifier.local);
      const references = new Map();

      for (const reference of variable?.references ?? []) {
        const identifier = reference.identifier;
        const target = specifier.type === 'ImportNamespaceSpecifier' ? identifier.parent : identifier;
        const hook = importedHook(source, context.filename, target);

        if (reactContracts.has(hook)) { references.set(target, hook); }
      }

      const bindings = new Map();

      for (const [target, hook] of references) {
        if (!bindings.has(hook)) {
          let name = 'useCoreLint' + imports.length;

          while (names.has(name)) { name += '_'; }

          names.add(name);
          bindings.set(hook, name);
          // Reducer dispatch commits and schedules the same way as a state
          // setter in Core. Give update diagnostics that tuple contract too.
          const contract = hook === 'useReducer' && ruleName.startsWith('set-state-') ? 'useState' : hook;

          imports.push(contract + ' as ' + name);
        }

        edits.push({ start: target.range[0], end: target.range[1], replacement: bindings.get(hook) });
      }

      if (references.size) { insertion = statement.range[1]; }
    }
  }

  if (imports.length) { edits.push({ start: insertion, end: insertion, replacement: ';import {' + imports.join(',') + "} from 'react';" }); }

  let text = '';
  let cursor = 0;

  for (const edit of edits.sort((a, b) => a.start - b.start)) {
    text += source.text.slice(cursor, edit.start);
    edit.mappedStart = text.length;
    text += edit.replacement;
    edit.mappedEnd = text.length;
    cursor = edit.end;
  }

  text += source.text.slice(cursor);

  // Only the compiler's analysis view gets synthetic hook contracts. ESLint's
  // AST, source text and fixes remain untouched; positions map back in UTF-16.
  const view = new Proxy({}, {
    get(_target, key) {
      if (key === 'text') { return text; }

      const value = Reflect.get(source, key, source);

      return typeof value === 'function' ? value.bind(source) : value;
    },
  });

  const lines = [0];

  for (let index = 0; index < text.length; index++) { if (text[index] === '\n') { lines.push(index + 1); } }

  function position(location) {
    const index = lines[location.line - 1] + location.column;
    let offset = 0;

    for (const edit of edits) {
      if (index < edit.mappedStart) { break; }

      if (index < edit.mappedEnd) { return source.getLocFromIndex(edit.start + Math.min(index - edit.mappedStart, edit.end - edit.start)); }

      offset += edit.replacement.length - (edit.end - edit.start);
    }

    return source.getLocFromIndex(index - offset);
  }

  return { view, location: loc => loc.start ? { start: position(loc.start), end: position(loc.end) } : position(loc) };
}

export function compilerRule(name) {
  const rule = reactHooks.rules[name];

  return {
    ...rule,
    create(context) {
      const source = compilerSource(context, name);
      const report = descriptor => {
        const { fix: _fix, suggest: _suggest, ...problem } = descriptor;
        const loc = descriptor.loc && source.location(descriptor.loc);
        const node = loc && context.sourceCode.getNodeByRangeIndex(context.sourceCode.getIndexFromLoc(loc.start ?? loc));
        let render = node;

        while (render && !(functionTypes.has(render.type) && renderFunction(render))) { render = render.parent; }

        if (!render || name === 'purity' && !renderScope(node)) { return; }

        context.report({
          ...problem,
          ...loc ? { loc } : {},
          ...descriptor.message ? { message: name === 'error-boundaries'
            ? 'Constructing child JSX does not execute it. Catch failures around the render transaction or host operation instead.'
            : name === 'static-components' ? 'Declare component definitions outside render so function-based compilation metadata stays stable.'
            : coreMessage(descriptor.message.split(/\n[^\n]*:\d+:\d+\n/)[0].trim()) } : {},
        });
      };

      return rule.create(contextWith(context, source.view, report, [{ ...context.options[0], compilationMode: 'all' }]));
    },
  };
}

export const rulesOfHooks = {
  ...reactHooks.rules['rules-of-hooks'],
  create(context) {
    const rule = reactHooks.rules['rules-of-hooks'];
    const listeners = rule.create(contextWith(context, context.sourceCode, descriptor =>
      context.report({ ...descriptor, ...descriptor.message ? { message: coreMessage(descriptor.message) } : {} })));

    return {
      ...listeners,
      CallExpression(node) {
        const hook = importedHook(context.sourceCode, context.filename, node.callee);

        if (hook && /^use[A-Z0-9]/.test(hook)) {
          const callee = { ...node.callee, type: 'Identifier', name: hook };

          return listeners.CallExpression({ ...node, callee });
        }

        return listeners.CallExpression(node);
      },
    };
  },
};

function immutableOrigin(source, filename, node, seen = new Set()) {
  const root = rootIdentifier(node);
  const variable = root && variableAt(source, root);

  if (!variable || seen.has(variable)) { return false; }

  seen.add(variable);

  const definition = variable.defs[0];

  if (definition?.type === 'Parameter') { return renderFunction(variable.scope.block); }

  if (definition?.type !== 'Variable') { return false; }

  const initial = unwrap(definition.node.init);

  if (initial?.type === 'CallExpression' && ['useState', 'useReducer'].includes(importedHook(source, filename, initial.callee))) {
    return definition.node.id.type === 'ArrayPattern' && definition.node.id.elements[0]?.name === root.name;
  }

  return immutableOrigin(source, filename, initial, seen);
}

export const immutability = {
  ...compilerRule('immutability'),
  create(context) {
    const listeners = compilerRule('immutability').create(context);

    return {
      ...listeners,
      CallExpression(node) {
        if (mutators.has(property(node.callee)) && immutableOrigin(context.sourceCode, context.filename, node.callee.object)) {
          context.report({ node, message: 'Do not mutate props or hook state. Create a new value and use its setter instead.' });
        }
      },
    };
  },
};

export const globals = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep shared mutable state out of @bedrock-core render functions.' },
    schema: [],
    messages: { mutation: 'Do not mutate shared value "{{name}}" during render. Update it in an effect or event callback.' },
  },
  create(context) {
    const source = context.sourceCode;

    function check(node, target, mutation = false) {
      const render = renderScope(node);
      target = unwrap(target);

      if (target?.type === 'ObjectPattern' || target?.type === 'ArrayPattern') {
        for (const item of target.properties ?? target.elements) {
          if (item) { check(node, item.type === 'Property' ? item.value : item.type === 'RestElement' ? item.argument : item); }
        }

        return;
      }

      let root = rootIdentifier(target);

      if (!render || !root) { return; }

      let variable = variableAt(source, root);
      const seen = new Set();

      while ((mutation || target.type === 'MemberExpression') && variable && !seen.has(variable)) {
        seen.add(variable);

        const definition = variable.defs[0];
        const origin = definition?.type === 'Variable' ? rootIdentifier(definition.node.init) : undefined;

        if (!origin) { break; }

        root = origin;
        variable = variableAt(source, root);
      }

      const scope = source.getScope(render);
      let owner = variable?.scope;

      while (owner && owner !== scope) { owner = owner.upper; }

      if (!owner) { context.report({ node, messageId: 'mutation', data: { name: root.name } }); }
    }

    return {
      AssignmentExpression(node) { check(node, node.left); },
      UpdateExpression(node) { check(node, node.argument); },
      UnaryExpression(node) { if (node.operator === 'delete') { check(node, node.argument); } },
      CallExpression(node) {
        if (mutators.has(property(node.callee))) { check(node, node.callee.object, true); }

        if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier'
          && (node.callee.object.name === 'Object' && property(node.callee) === 'assign'
            || node.callee.object.name === 'Reflect' && ['set', 'deleteProperty', 'defineProperty'].includes(property(node.callee)))) {
          check(node, node.arguments[0], true);
        }
      },
    };
  },
};

function returnsFactory(implementation, source, filename) {
  const keys = source.visitorKeys;
  const seen = new Set();
  const children = (node, predicate) => (keys[node.type] ?? []).some(key => Array.isArray(node[key])
    ? node[key].some(child => child && predicate(child)) : node[key] && predicate(node[key]));
  const componentBody = node => ['JSXElement', 'JSXFragment'].includes(node.type)
    || node.type === 'CallExpression' && /^(?:use[A-Z0-9]|[A-Z])/.test(importedHook(source, filename, node.callee) ?? node.callee.name ?? '')
    || !functionTypes.has(node.type) && children(node, componentBody);

  function callable(node) {
    node = unwrap(node);

    if (!node || seen.has(node)) { return false; }

    seen.add(node);

    if (functionTypes.has(node.type)) { return renderFunction(node) || componentBody(node.body); }

    if (node.type === 'Identifier') {
      const definition = variableAt(source, node)?.defs[0];

      return callable(definition?.type === 'FunctionName' ? definition.node : definition?.node.init);
    }

    if (node.type === 'ConditionalExpression' || node.type === 'LogicalExpression') { return children(node, callable); }

    return node.type === 'CallExpression' && renderFactories.has(importedHook(source, filename, node.callee));
  }

  function returns(node) {
    if (!node || functionTypes.has(node.type)) { return false; }

    return node.type === 'ReturnStatement' ? callable(node.argument) : children(node, returns);
  }

  return implementation.body.type === 'BlockStatement' ? returns(implementation.body) : callable(implementation.body);
}

export const componentHookFactories = {
  meta: {
    type: 'problem',
    docs: { description: 'Construct @bedrock-core components, contexts and hooks outside render.' },
    schema: [],
    messages: {
      nested: 'Declare custom hooks outside render so their hook contract stays fixed.',
      factory: 'Construct components, contexts and custom hooks outside render.',
    },
  },
  create(context) {
    function nested(node) {
      if (/^use[A-Z0-9]/.test(functionName(node) ?? '') && renderScope(node)) {
        context.report({ node, messageId: 'nested' });
      }
    }

    return {
      FunctionDeclaration: nested,
      FunctionExpression: nested,
      ArrowFunctionExpression: nested,
      CallExpression(node) {
        if (!renderScope(node)) { return; }

        const hook = importedHook(context.sourceCode, context.filename, node.callee);
        let factory = renderFactories.has(hook);

        if (node.callee.type === 'Identifier') {
          const definition = variableAt(context.sourceCode, node.callee)?.defs[0];
          const implementation = definition?.type === 'FunctionName' ? definition.node : unwrap(definition?.node.init);

          factory ||= functionTypes.has(implementation?.type) && returnsFactory(implementation, context.sourceCode, context.filename);
        }

        if (factory) { context.report({ node, messageId: 'factory' }); }
      },
    };
  },
};

