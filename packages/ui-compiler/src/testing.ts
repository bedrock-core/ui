import type { JSX } from '@bedrock-core/ui-runtime';
import { childElements, optionElements, CONTAINER_TYPE, SCREEN_TYPE, isTextElementType, liveTextLength } from '@bedrock-core/ui-runtime/compile';
import type { IrNode } from './ir';
import type { Control, Document } from './jsonui';
import { childrenOf } from './nodes';
import { swapControlName } from './nodes/primitives/swap';
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

function roleOf(element: JSX.Element, kind: IrNode['kind'] | 'option'): TestRole {
  const role = element.props.testRole;

  if (role !== undefined) {
    if (typeof role !== 'string' || !TEST_ROLES.has(role)) {
      throw new Error(`Unknown testRole "${String(role)}".`);
    }

    return role;
  }

  return element.props.__testRole === 'checkbox' || kind === 'option' ? 'checkbox' : roles[kind] ?? 'group';
}

function declaredNameOf(element: JSX.Element): TestControlMetadata['name'] {
  const value = element.props.testName;

  if (value !== undefined && typeof value !== 'string') {
    throw new Error('testName must be a string.');
  }

  const name = value ?? element.props.__testName;

  return typeof name === 'string' ? { kind: 'declared', value: name } : undefined;
}

/** A composed input can draw its caption outside its native hitbox. */
function captionNameOf(element: JSX.Element): TestControlMetadata['name'] {
  const names: NonNullable<TestControlMetadata['name']>[] = [];

  const visit = (node: JSX.Element): void => {
    if (isTextElementType(node.type)) {
      const value = node.props.value;
      const tail: unknown = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;
      const metrics = node.props.__textMetrics;

      if (typeof tail === 'string') {
        names.push({ kind: liveTextLength(node) !== undefined
          ? 'bound'
          : typeof metrics === 'object' && metrics !== null && 'isKey' in metrics && metrics.isKey === true ? 'translated' : 'literal',
        value: tail.replace(/§[0-9a-z]/gi, '') });
      }

      return;
    }

    childElements(node.props.children).forEach(visit);
  };

  childElements(element.props.__testCaption).forEach(visit);

  if (names.length === 1) { return names[0]; }

  return names.length > 0 && names.every(name => name.kind === 'literal') ? { kind: 'literal', value: names.map(name => name.value).join(' ') } : undefined;
}

const roles: Partial<Record<IrNode['kind'], TestRole>> = {
  button: 'button', input: 'textbox', toggle: 'checkbox', slider: 'slider',
  dropdown: 'combobox', select: 'listbox', swap: 'checkbox', text: 'text', image: 'image',
};
const interactions: Record<ScreenTestMetadata['host'], Partial<Record<IrNode['kind'], TestControlMetadata['interaction']>>> = {
  'form-action': { button: 'form-button', swap: 'local-toggle' },
  'form-modal': { button: 'modal-button', input: 'form-input', toggle: 'form-toggle', slider: 'form-slider', dropdown: 'form-dropdown', swap: 'local-toggle' },
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
    if (node.kind === 'swap' && node.passive === true) { return; }

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

    const controls = [...this.nodes.values()].flatMap(({ element, node }): TestControlMetadata[] => {
      const id = testIdOf(element);
      const role = roleOf(element, node.kind);
      const name = declaredNameOf(element) ?? captionNameOf(element) ?? nameOf(node);
      const locations = paths.get(node.kind === 'swap' ? swapControlName(String(document.namespace), node.id) : node.name) ?? [];

      const control: TestControlMetadata = {
        node: node.name, role,
        ...id === undefined ? {} : { testId: id },
        ...name === undefined ? {} : { name },
        paths: locations,
        interaction: locations.length === 1
          ? interactions[host][node.kind] ?? 'unsupported'
          : 'unsupported',
      };

      if (node.kind !== 'select') { return [control]; }

      // Option names repeat across fields; only descendants of this Select identify its instances.
      const options = optionElements(element.props.children).map((option, index): TestControlMetadata => {
        const id = testIdOf(option);
        const optionName = declaredNameOf(option) ?? (typeof option.props.label === 'string'
          ? { kind: 'literal' as const, value: option.props.label }
          : undefined);
        const locations = (paths.get(`option_${String(index)}`) ?? []).filter(location => control.paths.some(parent =>
          parent.length < location.length && parent.every((key, offset) => location[offset] === key)));

        return {
          node: `${node.name}/option_${String(index)}`, role: roleOf(option, 'option'),
          ...id === undefined ? {} : { testId: id },
          ...optionName === undefined ? {} : { name: optionName },
          paths: locations,
          interaction: host === 'form-modal' && locations.length === 1 ? 'form-option' : 'unsupported',
        };
      });

      return [control, ...options];
    });

    return { schemaVersion: TEST_METADATA_VERSION, screen, namespace: String(document.namespace), host, ...testId === undefined ? {} : { testId }, controls };
  }
}
