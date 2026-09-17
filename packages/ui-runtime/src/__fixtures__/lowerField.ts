import type { Player } from '@minecraft/server';
import { Form } from '../components/Form';
import { playerOwner } from '../core/fabric';
import { isElement } from '../core/guards';
import { expandAndResolveContexts } from '../core/render/phases/expand';
import { clearSession } from '../core/render/session';
import { createInitialContext } from '../core/render/traversal';
import { MODAL_FORM_SLOT_TYPE } from '../core/roots';
import type { FunctionComponent, JSX } from '../jsx';

let lowered = 0;

/**
 * One field as a render lowers it: expanded under a `<Form>`, so it answers to the modal host and
 * comes back as its native element.
 */
export function lowerField<P>(component: FunctionComponent<P>, props: P): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a component element with the component's own props
  const field = { type: component, props } as unknown as JSX.Element;
  // A fresh owner per call, released afterwards, so no fiber outlives the one lowering.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
  const owner = playerOwner({ id: `lower-field-${++lowered}` } as unknown as Player);
  const tree = expandAndResolveContexts({ type: Form, props: { children: [field] } }, createInitialContext(), owner);

  clearSession(owner);

  const element = firstField(tree);

  if (element === undefined) {
    throw new Error('lowerField: the component lowered to no field');
  }

  return element;
}

function firstField(node: JSX.Node): JSX.Element | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstField(child);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (!isElement(node)) {
    return undefined;
  }

  if (typeof node.type === 'string' && node.type.startsWith('modal-') && node.type !== MODAL_FORM_SLOT_TYPE) {
    return node;
  }

  return firstField(node.props.children);
}
