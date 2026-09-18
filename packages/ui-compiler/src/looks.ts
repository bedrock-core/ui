import type { JSX } from '@bedrock-core/ui-runtime';
import { BUTTON_TYPE, childElements, hasMechanism, type VariantTable, walkWithOwners } from '@bedrock-core/ui-runtime/compile';

/**
 * A look that follows state, as a host draws it: once per value the probe saw,
 * with the choice carried at runtime.
 *
 * What differs per host is only how the choice travels — an entry on a form,
 * the stack size of a button's own slot on a chest. Which elements get looks,
 * what each look is made of and which probe readings they cover are the same
 * everywhere, and live here.
 */

/**
 * The elements whose looks a host draws.
 *
 * A button's face is drawn once per engine state already, so its looks are
 * one more dimension of gates inside those states. Any other element is drawn
 * once per look beside itself, which copying makes possible only for an
 * element with no mechanism of its own — a copy of a press, a slot or a live
 * value would be a second reader of the same cell. A hugging button's face is
 * shared without its children, so it has no look to draw either. What is left
 * keeps the build's value and is reported instead.
 */
export const drawnPerLook = (
  tables: ReadonlyMap<JSX.Element, VariantTable>,
): ReadonlyMap<JSX.Element, VariantTable> =>
  new Map([...tables].filter(([element]) => (element.type === BUTTON_TYPE
    ? element.props.__hug !== true
    : !hasMechanism(element))));

/**
 * Every baked element a drawn look covers: the button, and each descendant a
 * value of its look is read from — a caption's colour, a tick's texture.
 */
export const carriedPositions = (tables: Iterable<VariantTable>): ReadonlySet<number> =>
  new Set([...tables].flatMap(table => [table.position, ...table.props.map(read => read.position)]));

/**
 * The element as each of its looks draws it.
 *
 * A look is the subtree rebuilt with the values the probe saw in that render,
 * so the face pass draws it the way it draws the element itself — the texture
 * a toggle wears, the tick inside a checkbox, the colour of a caption. Only
 * the elements a value was read from are rebuilt; everything else is the
 * author's own element, shared between the looks.
 */
export const looksOf = (tree: JSX.Element, table: VariantTable): JSX.Element[] => {
  const { elements, parents } = walkWithOwners(tree);
  const root = elements[table.position] ?? tree;
  const parent = elements[parents[table.position] ?? -1];
  const origin = parent === undefined ? undefined : pointOf(parent);

  return table.combinations.map((combination) => {
    const overrides = new Map<JSX.Element, Record<string, unknown>>();

    table.props.forEach(({ position, prop }, index) => {
      const target = elements[position];

      if (target !== undefined) {
        overrides.set(target, { ...overrides.get(target), [prop]: combination[index] });
      }
    });

    return rebuild(root, overrides, origin === undefined ? undefined : { was: origin, now: origin });
  });
};

interface Point {
  x: number;
  y: number;
}

/** Where the layout put an element, on the canvas; undefined for one it never placed. */
const pointOf = (element: JSX.Element): Point | undefined => {
  const { jsonUIx: x, jsonUIy: y } = element.props;

  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
};

/**
 * The element with its own and its descendants' overridden props put back.
 *
 * A look reads positions from each element's parent, so an element whose look
 * moves it is placed from where its parent now is, and one that holds still
 * inside a parent that moved goes with the parent.
 */
const rebuild = (
  element: JSX.Element,
  overrides: ReadonlyMap<JSX.Element, Record<string, unknown>>,
  parent?: { was: Point; now: Point },
): JSX.Element => {
  const own = overrides.get(element);
  const was = pointOf(element);
  const now = was === undefined || parent === undefined
    ? was
    : {
        x: typeof own?.['jsonUIx'] === 'number' ? parent.now.x + own['jsonUIx'] : was.x + parent.now.x - parent.was.x,
        y: typeof own?.['jsonUIy'] === 'number' ? parent.now.y + own['jsonUIy'] : was.y + parent.now.y - parent.was.y,
      };
  const moved = was !== undefined && now !== undefined && (was.x !== now.x || was.y !== now.y);
  const children = childElements(element.props.children)
    .map(child => rebuild(child, overrides, was === undefined || now === undefined ? parent : { was, now }));
  const changed = children.some((child, index) => child !== childElements(element.props.children)[index]);

  if (own === undefined && !moved && !changed) {
    return element;
  }

  return {
    ...element,
    props: {
      ...element.props,
      ...own,
      ...now === undefined ? {} : { jsonUIx: now.x, jsonUIy: now.y },
      ...childElements(element.props.children).length === 0 ? {} : { children },
    },
  };
};
