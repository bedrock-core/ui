import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { buildScreenTree, compileDataOf, hostFor, oreElements, oreLayout, textTranslations, type CompiledSnapshot, type OreLayout } from '@bedrock-core/ui-runtime/compile';
import { checkTrans, transRecords } from '../../trans';
import type { ScreenLang } from '../../lang';

export interface CompiledOreScreen {
  kind: 'custom';
  name: string;
  addon: string;
  namespace: string;
  title: string;
  ore: OreLayout;
  snapshot: CompiledSnapshot;
  document: { namespace: string };
  facesNamespace: string;
  faces: Record<string, never>;
  hasBackdrop: false;
  lang: ScreenLang;
}

/** Compiles initial Ore geometry and stable control addresses; live layout and values remain server-owned. */
export function compileExperimentalOreScreen(Screen: FunctionComponent, spec: { name: string; namespace: string }): CompiledOreScreen {
  if (![spec.name, spec.namespace].every(value => /^[A-Za-z0-9_-]+$/.test(value))) { throw new Error('Invalid Ore screen name or namespace.'); }

  const tree = buildScreenTree(Screen);

  if (hostFor(tree).id !== 'experimental-ore-ui') { throw new Error('Ore compilation requires <Experimental_OreUI>.'); }

  const namespace = `${spec.namespace}_${spec.name}`;
  const ore = oreLayout(tree, namespace);

  checkTrans(tree, spec.name);
  const lang: ScreenLang = {};

  oreElements(tree).forEach(({ id, element }) => {
    const translations = textTranslations(element);

    for (const [locale, value] of Object.entries(translations ?? {})) { (lang[locale] ??= {})[`core.ore.${namespace}.${id}`] = value; }
  });
  const data = compileDataOf(tree);
  const serverOre: OreLayout = { ...ore, nodes: ore.nodes.map(({ gates: _gates, switch: _switch, parent: _parent, resources: _resources, flow: _flow, fill: _fill, layer: _layer, ...node }) => node) };

  return {
    kind: 'custom', name: spec.name, addon: spec.namespace, namespace, title: `core-ore:${namespace}`,
    ore, snapshot: { ore: serverOre, shape: ore.nodes.map(node => `${node.id}:${node.kind}`).join('|'), texts: [], vis: [],
      ...data === undefined ? {} : { data }, ...transRecords(tree).length ? { trans: transRecords(tree) } : {} },
    document: { namespace }, facesNamespace: `${spec.namespace}_faces`, faces: {}, hasBackdrop: false, lang,
  };
}
