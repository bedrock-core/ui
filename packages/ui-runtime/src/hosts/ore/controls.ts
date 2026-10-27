import { childElements } from '../../core/guards';
import type { JSX } from '../../jsx';

export interface OreSwitch {
  readonly group: string;
  readonly index?: number;
  readonly exclusive: boolean;
  readonly on: boolean;
  readonly passive: boolean;
}
export type OreGate = { readonly owner: string; readonly states: readonly string[] }
  | { readonly selection: string; readonly group: string; readonly indexes: readonly number[] };
export interface OreDecoration { readonly switch?: OreSwitch; readonly gates?: readonly OreGate[]; readonly fill?: string; readonly layer?: number }

const states = ['on', 'onHover', 'onLocked', 'onLockedHover', 'off', 'offHover', 'offLocked', 'offLockedHover'];
const parentOf = (id: string): string => id.slice(0, id.lastIndexOf('_'));

/** Projects the shared Swap and SelectionPanel contracts without changing their component trees. */
export function oreDecorations(tree: JSX.Element): ReadonlyMap<string, OreDecoration> {
  const nodes = new Map<string, JSX.Element>();
  const own = new Map<string, OreGate[]>();
  const switches = new Map<string, OreSwitch>();

  const visit = (node: JSX.Element, id: string): void => {
    nodes.set(id, node); childElements(node.props.children).forEach((child, index) => visit(child, `${id}_${index}`));
  };

  visit(tree, 'n');

  const gate = (id: string, value: OreGate): void => { own.set(id, [...own.get(id) ?? [], value]); };

  for (const [id, node] of nodes) {
    if (node.type === 'selection-page-slot') {
      const indexes = node.props.selectionActiveIndexes ?? node.props.selectionIndexes ?? [node.props.selectionIndex];

      if (typeof node.props.selectionGroup !== 'string' || !Array.isArray(indexes) || indexes.some(value => !Number.isSafeInteger(value) || Number(value) < 0)) {
        throw new Error('Invalid Ore selection membership.');
      }

      gate(id, { selection: id, group: node.props.selectionGroup, indexes: indexes.map(Number) });
    }

    if (node.type !== 'swap-slot') { continue; }

    const exclusive = node.props.exclusive === true;
    const group = typeof node.props.group === 'string' ? node.props.group : exclusive ? parentOf(id) : id;

    switches.set(id, { group, exclusive, on: node.props.defaultOn === true, passive: node.props.passive === true,
      ...typeof node.props.index === 'number' ? { index: node.props.index } : {} });
    const looks = childElements(node.props.children).map((child, index) => ({ child, id: `${id}_${index}` }))
      .filter(({ child }) => child.type === 'swap-look-slot' && child.props.__swapInputs !== true);

    for (const { child, id: lookId } of looks) {
      const allowed = states.filter(state => (looks.some(look => look.child.props.state === state) ? state : state.startsWith('on') ? 'on' : 'off') === child.props.state);

      gate(lookId, { owner: id, states: allowed });

      if (typeof child.props.draws === 'string') {
        const drawn = [...nodes].find(([key, value]) => parentOf(key) === parentOf(id) && value.props.id === child.props.draws);

        if (!drawn) { throw new Error('Ore swap draws an unknown sibling: ' + child.props.draws); }

        gate(drawn[0], { owner: id, states: allowed });
      }
    }
  }

  for (const [id, node] of nodes) {
    if (node.props.follows !== true) { continue; }

    const siblings = [...nodes].filter(([key]) => parentOf(key) === parentOf(id));
    const previous = siblings[siblings.findIndex(([key]) => key === id) - 1];

    if (!previous || !switches.has(previous[0])) { throw new Error('Ore follows requires a preceding Swap.'); }

    gate(id, { owner: previous[0], states: states.filter(state => state.startsWith('on')) });
  }

  const result = new Map<string, OreDecoration>();

  for (const id of nodes.keys()) {
    const gates = own.get(id) ?? [];
    let fill: string | undefined, layer = 0;

    for (let at = id; at; at = parentOf(at)) {
      const current = nodes.get(at), parent = nodes.get(parentOf(at));

      if (current?.props.__swapInputs === true) { fill = parentOf(at); }

      if (parent?.type === 'swap-slot' && current?.type !== 'swap-look-slot') { layer = 2; }
    }

    result.set(id, { ...switches.has(id) ? { switch: switches.get(id) } : {}, ...gates.length ? { gates } : {},
      ...fill ? { fill } : {}, ...layer ? { layer } : {} });
  }

  return result;
}
