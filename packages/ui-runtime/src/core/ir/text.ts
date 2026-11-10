import { isTextElementType } from '../../components/Text';
import { BUTTON_TYPE } from '../../components/Button';
import { MODAL_FORM_BUTTON_SLOT_TYPE } from '../../components/Form/FormButton';
import { childElements } from '../guards';
import type { JSX } from '../../jsx';

const hasBakedCaption = (element: JSX.Element): boolean =>
  element.type === BUTTON_TYPE || element.type === MODAL_FORM_BUTTON_SLOT_TYPE;

/** Text whose value is carried separately from a button's shared appearance. */
export const textElements = (tree: JSX.Element): JSX.Element[] => {
  const found: JSX.Element[] = [];

  const visit = (element: JSX.Element): void => {
    if (hasBakedCaption(element)) { return; }

    if (isTextElementType(element.type)) { found.push(element); }

    childElements(element.props.children).forEach(visit);
  };

  visit(tree);

  return found;
};

/** Comparable values in stable document order, including message parameters. */
export const textValues = (tree: JSX.Element): string[] => textElements(tree).map((element) => {
  const value = element.props.value;
  const tail = typeof value === 'object' && value !== null && 'tail' in value ? value.tail : undefined;

  return typeof tail === 'string' ? tail : JSON.stringify(tail) ?? '';
});

/** Applies compiler-detected text positions to a newly rendered tree. */
export const textChannelsAt = (tree: JSX.Element, positions: readonly number[]): void => {
  const channels = new Set(positions);

  const eligible: JSX.Element[] = [];

  const visit = (node: JSX.Element, canCarry: boolean): void => {
    const canCarryText = canCarry && !hasBakedCaption(node);

    if (isTextElementType(node.type)) {
      node.props.__textChannel = false;

      if (canCarryText) { eligible.push(node); }
    }

    for (const child of childElements(node.props.children)) {
      visit(child, canCarryText);
    }
  };

  visit(tree, true);
  eligible.forEach((element, position) => { element.props.__textChannel = channels.has(position); });
};

/** Whether the compiler assigned this text a runtime value channel. */
export const hasTextChannel = (element: JSX.Element): boolean => element.props.__textChannel === true;
