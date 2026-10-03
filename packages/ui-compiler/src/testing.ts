import type { JSX } from '@bedrock-core/ui-runtime';
import { childElements, CONTAINER_TYPE, SCREEN_TYPE } from '@bedrock-core/ui-runtime/compile';
import type { IrNode } from './ir';
import type { Control, Document } from './jsonui';
import { childrenOf } from './nodes';
import { TEST_METADATA_VERSION } from './testMetadata';
import type { ScreenTestMetadata, TestControlMetadata, TestRole } from './testMetadata';

export type { ScreenTestMetadata, TestControlMetadata, TestRole } from './testMetadata';

const TEST_ROLES = new Set<TestRole>(['screen', 'button', 'checkbox', 'textbox', 'slider', 'combobox', 'listbox', 'text', 'image', 'group']);

function testIdOf(element: JSX.Element): string | undefined {
  const value = element.props.testId;

  if (value !== undefined && (typeof value !== 'string' || value.trim() === '' || value.length > 256)) {
    throw new Error('testId must be a nonempty string of at most 256 characters.');
  }

  return value;
}

function roleOf(element: JSX.Element, node: IrNode): TestRole {
  const role = element.props.testRole;

  if (role !== undefined) {
    if (typeof role !== 'string' || !TEST_ROLES.has(role)) {
      throw new Error(`Unknown testRole "${String(role)}".`);
    }

    return role;
  }

  return element.props.__testRole === 'checkbox' ? 'checkbox' : roles[node.kind] ?? 'group';
}

function declaredNameOf(element: JSX.Element): TestControlMetadata['name'] {
  const value = element.props.testName;

  if (value !== undefined && typeof value !== 'string') {
    throw new Error('testName must be a string.');
  }

  const name = value ?? element.props.__testName;

  return typeof name === 'string' ? { kind: 'declared', value: name } : undefined;
}

const roles: Partial<Record<IrNode['kind'], TestRole>> = {
  button: 'button', input: 'textbox', toggle: 'checkbox', slider: 'slider',
  dropdown: 'combobox', select: 'listbox', text: 'text', image: 'image',
};
const interactions: Record<ScreenTestMetadata['host'], Partial<Record<IrNode['kind'], TestControlMetadata['interaction']>>> = {
  'form-action': { button: 'form-button' },
  'form-modal': { button: 'modal-button', input: 'form-input', toggle: 'form-toggle', slider: 'form-slider', dropdown: 'form-dropdown' },
  'chest': {},
};

function nameOf(node: IrNode): TestControlMetadata['name'] {
  if (node.kind === 'text') {
    return { kind: node.address !== undefined ? 'bound' : node.localize ? 'translated' : 'literal', value: node.text };
  }

  if (node.kind !== 'button' || node.looks !== undefined) {
    return undefined;
  }

  const names = childrenOf(node).map(nameOf).filter(name => name !== undefined);

  if (names.length === 0 || names.some(name => name.kind !== 'literal')) {
    return names.length === 1 ? names[0] : undefined;
  }

  return { kind: 'literal', value: names.map(name => name.value).join(' ').replace(/§[0-9a-z]/gi, '') };
}

/** Maps source identities to concrete emitted instances without adding JSON UI properties. */
export class TestMetadataCollector {
  private readonly nodes = new Map<string, { element: JSX.Element; node: IrNode }>();

  public readonly onNode = (element: JSX.Element, node: IrNode): void => {
    testIdOf(element);
    this.nodes.set(node.name, { element, node });
  };

  public finish(tree: JSX.Element, document: Document, screen: string, host: ScreenTestMetadata['host']): ScreenTestMetadata {
    let testId: string | undefined;

    const visitRoot = (element: JSX.Element): void => {
      if ([SCREEN_TYPE, 'modal-form', CONTAINER_TYPE].includes(String(element.type))) {
        testId = testIdOf(element);
      }

      childElements(element.props.children).forEach(visitRoot);
    };

    visitRoot(tree);

    const paths = new Map<string, string[][]>();

    const walk = (control: Control, location: string[]): void => {
      // Factories and grids need runtime instance keys; array order is not an identity.
      if (control.type === 'grid' || 'factory' in control || 'grid_item_template' in control) {
        return;
      }

      for (const [index, entry] of (control.controls ?? []).entries()) {
        for (const [key, child] of Object.entries(entry)) {
          const name = key.split('@')[0] ?? key;
          const next = [...location, 'controls', String(index), key];

          paths.set(name, [...paths.get(name) ?? [], next]);
          walk(child, next);
        }
      }
    };

    const root = document['screen'];

    if (typeof root === 'object' && root !== null && 'type' in root) {
      paths.set('root', [['screen']]);
      walk(root, ['screen']);
    }

    const controls = [...this.nodes.values()].map(({ element, node }): TestControlMetadata => {
      const id = testIdOf(element);
      const role = roleOf(element, node);
      const name = declaredNameOf(element) ?? nameOf(node);
      const locations = paths.get(node.name) ?? [];

      return {
        node: node.name, role,
        ...id === undefined ? {} : { testId: id },
        ...name === undefined ? {} : { name },
        paths: locations,
        interaction: locations.length === 1
          ? interactions[host][node.kind] ?? 'unsupported'
          : 'unsupported',
      };
    });

    return { schemaVersion: TEST_METADATA_VERSION, screen, namespace: String(document.namespace), host, ...testId === undefined ? {} : { testId }, controls };
  }
}
