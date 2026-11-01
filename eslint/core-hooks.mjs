import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runtime = path.dirname(fileURLToPath(import.meta.resolve('@bedrock-core/ui-runtime')));
const hookNames = ['useEffect', 'useRef', 'useState', 'useReducer', 'useContext', 'usePlayer', 'useEvent', 'useExit', 'useObservable', 'useComposed', 'useMechanism', 'useRenderOwner', 'useCompiledData'];
const entrypoints = new Set(['', 'index', 'hooks', 'hooks/index', ...hookNames.map(name => 'hooks/' + name)].map(file => path.resolve(runtime, file)));
const modules = new Set(['@bedrock-core/ui', '@bedrock-core/ui-runtime', '@bedrock-core/ui/navigation', '@bedrock-core/navigation', '@bedrock-core/i18n']);
const expressions = new Set(['TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression', 'ChainExpression', 'TSSatisfiesExpression']);

function unwrap(node) {
  while (node && expressions.has(node.type)) { node = node.expression; }

  return node;
}

function variableAt(source, node) {
  let scope = source.getScope(node);

  while (scope) {
    const variable = scope.set.get(node.name);

    if (variable) { return variable; }

    scope = scope.upper;
  }

  return undefined;
}

function importedHook(source, filename, node) {
  node = unwrap(node);

  const namespace = node?.type === 'MemberExpression' && node.object.type === 'Identifier';
  const identifier = namespace ? node.object : node;

  if (identifier?.type !== 'Identifier') { return undefined; }

  const definition = variableAt(source, identifier)?.defs[0];

  if (definition?.type !== 'ImportBinding') { return undefined; }

  const specifier = definition.node;
  const module = definition.parent.source.value;
  const internal = typeof module === 'string' && module.startsWith('.')
    && entrypoints.has(path.resolve(path.dirname(filename), module).replace(/\.(?:[cm]?js|tsx?)$/, ''));

  if (!modules.has(module) && !internal) { return undefined; }

  if (namespace) {
    return specifier.type !== 'ImportNamespaceSpecifier' ? undefined
      : !node.computed && node.property.type === 'Identifier' ? node.property.name
        : node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string' ? node.property.value : undefined;
  }

  return specifier.type === 'ImportSpecifier' ? specifier.imported.name ?? specifier.imported.value : undefined;
}

function dependencyPath(node) {
  node = unwrap(node);

  if (node?.type === 'Identifier') { return node.name; }

  if (node?.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const parent = dependencyPath(node.object);

    return parent ? parent + '.' + node.property.name : undefined;
  }

  return undefined;
}

function capturedPath(identifier) {
  let node = identifier;

  while (node.parent && (expressions.has(node.parent.type)
    || (node.parent.type === 'MemberExpression' && node.parent.object === node && !node.parent.computed))) {
    node = node.parent;
  }

  if (node.type === 'MemberExpression' && node.parent?.type === 'CallExpression' && node.parent.callee === node) {
    node = node.object;
  }

  return dependencyPath(node) ?? identifier.name;
}

function stable(variable, source, filename) {
  const definition = variable.defs[0];
  const declaration = definition?.node;
  const initial = unwrap(declaration?.init);

  if (definition?.type !== 'Variable' || declaration.type !== 'VariableDeclarator' || definition.parent.kind !== 'const') { return false; }

  if (initial?.type === 'Literal' && (initial.value === null || typeof initial.value !== 'object')) { return true; }

  return declaration.id.type === 'Identifier' && initial?.type === 'CallExpression'
    && ['useRef', 'useRenderOwner'].includes(importedHook(source, filename, initial.callee));
}

function typeReference(reference) {
  if (reference.isTypeReference && !reference.isValueReference) { return true; }

  for (let node = reference.identifier.parent; node; node = node.parent) {
    if (node.type === 'TSTypeQuery') { return true; }
  }

  return false;
}

export const exhaustiveDeps = {
  meta: {
    type: 'problem',
    docs: { description: 'Require captured render values in @bedrock-core useEffect dependency arrays.' },
    schema: [],
    messages: {
      missing: 'useEffect is missing dependencies: {{dependencies}}.',
      array: 'useEffect dependencies must be an array literal without spreads so captures can be checked.',
      callback: 'useEffect needs an inline callback or a local function whose captures can be checked.',
      dependency: 'Dependency expressions must be identifiers or static property paths.',
    },
  },

  create(context) {
    const source = context.sourceCode;
    const filename = context.filename;

    return {
      CallExpression(node) {
        if (importedHook(source, filename, node.callee) !== 'useEffect' || node.arguments.length < 2
          || node.arguments[1].type === 'Identifier' && node.arguments[1].name === 'undefined'
          && !variableAt(source, node.arguments[1])?.defs.length) { return; }

        const dependencies = unwrap(node.arguments[1]);

        if (dependencies.type !== 'ArrayExpression' || dependencies.elements.some(item => !item || item.type === 'SpreadElement')) {
          context.report({ node: dependencies, messageId: 'array' });

          return;
        }

        const declared = new Set();

        for (const dependency of dependencies.elements) {
          const key = dependencyPath(dependency);

          if (key) { declared.add(key); } else { context.report({ node: dependency, messageId: 'dependency' }); }
        }

        let callback = unwrap(node.arguments[0]);

        if (declared.has(dependencyPath(callback))) { return; }

        if (callback?.type === 'Identifier') {
          const variable = variableAt(source, callback);
          const definition = variable?.defs[0];
          const writes = variable?.references.filter(reference => reference.isWrite()).length ?? 0;

          callback = writes > (definition?.type === 'FunctionName' ? 0 : 1) ? undefined
            : unwrap(definition?.type === 'FunctionName' ? definition.node : definition?.node.init);
        }

        if (!callback || !['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(callback.type)) {
          context.report({ node: node.arguments[0], messageId: 'callback' });

          return;
        }

        const scopes = new Set();
        let scope = source.getScope(node);

        while (scope && scope.type !== 'module' && scope.type !== 'global') {
          scopes.add(scope);

          if (scope.type === 'function') { break; }

          scope = scope.upper;
        }

        const callbackScope = source.getScope(callback);
        const missing = new Set();

        for (const reference of callbackScope.through) {
          const variable = reference.resolved;

          if (!variable || !scopes.has(variable.scope) || typeReference(reference)
            || stable(variable, source, filename)) { continue; }

          const key = capturedPath(reference.identifier);

          if (![...declared].some(dependency => key === dependency || key.startsWith(dependency + '.'))) { missing.add(key); }
        }

        if (missing.size) {
          context.report({ node: dependencies, messageId: 'missing', data: { dependencies: [...missing].sort().join(', ') } });
        }
      },
    };
  },
};

export { importedHook, unwrap, variableAt };

export default { rules: { 'exhaustive-deps': exhaustiveDeps } };

