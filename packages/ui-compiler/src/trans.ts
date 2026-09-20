import type { JSX } from '@bedrock-core/ui-runtime';
import { BUTTON_TYPE, childElements, type ComposedRecord, ContainerScreenError, isElement, isTextElementType } from '@bedrock-core/ui-runtime/compile';

/**
 * What the compiler reads off a `<Trans>` once it is built.
 *
 * A translated text is laid out by its build into lines of pieces, each a label
 * or a press hugging one. That layout is recorded on the text's box, so a screen
 * rendered at runtime can draw the same pieces, and every piece has to be one of
 * the two things a line can hold.
 */

/** Every `<Trans>` under `node`, in document order. */
const eachTrans = (node: unknown, visit: (element: JSX.Element, record: ComposedRecord) => void): void => {
  if (Array.isArray(node)) {
    node.forEach(child => eachTrans(child, visit));

    return;
  }

  if (!isElement(node)) {
    return;
  }

  const record = node.props.__trans;

  if (typeof record === 'object' && record !== null) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only <Trans> writes this prop, and it writes a record
    visit(node, record as ComposedRecord);

    return;
  }

  eachTrans(node.props.children, visit);
};

/** Every `<Trans>` of a built tree as its build laid it out, for a screen rendered at runtime to draw the same. */
export const transRecords = (tree: JSX.Element): ComposedRecord[] => {
  const records: ComposedRecord[] = [];

  eachTrans(tree, (_element, record) => {
    records.push(record);
  });

  return records;
};

/**
 * Refuses a `<Trans>` component that a line cannot hold: every piece is a label,
 * styled by a `<Text>`, or a press hugging one.
 *
 * @param tree - The built tree.
 * @param screen - The screen's name, for the message.
 */
export const checkTrans = (tree: JSX.Element, screen: string): void => {
  eachTrans(tree, (element) => {
    for (const line of childElements(element.props.children)) {
      for (const piece of childElements(line.props.children)) {
        const pressed = piece.type === BUTTON_TYPE && piece.props.__hug === true;

        if (!isTextElementType(piece.type) && !pressed) {
          throw new ContainerScreenError(
            `"${screen}" draws a <Trans> whose component became a ${String(piece.type)}.\n`
            + '  A component wrapping text in <Trans> is a <Text>, which styles it, or a press — a\n'
            + '  <Link>, a <Button>, or a button of your own — which hugs it.',
          );
        }
      }
    }
  });
};
