import { registerNativeComponents } from '../../components';
import { containerRoot } from '../../components/Container';
import { BUILD_OWNER, type Owner } from '../../core/fabric';
import { buildTree, cleanupComponentTree } from '../../core/render/tree';
import { DefaultTranslations } from '../../data/Translation';
import type { FunctionComponent, JSX } from '../../jsx';

/**
 * Builds a container screen's tree the way `render()` builds a form's —
 * expand, lay out, inherit, validate — with the owner deciding the rules.
 *
 * The build owner renders once with initial state and leaves no fibers
 * behind, so a build machine can compile screen after screen. An entity owner
 * keeps its fibers between calls, which is what lets state persist from one
 * render to the next while the entity is being viewed.
 *
 * @param root - The screen: a component, or an element rendering one.
 * @param owner - Who the render belongs to. Defaults to the build.
 * @returns The built tree, with `<Container>` at its root.
 * @throws ContainerScreenError when the tree breaks the container rules.
 */
export function buildContainerTree(
  root: JSX.Element | FunctionComponent,
  owner: Owner = BUILD_OWNER,
): JSX.Element {
  // Every build shares one owner id, so a previous screen's fibers must not
  // lend this one their state.
  if (owner.kind === 'build') {
    cleanupComponentTree(owner);
  }

  try {
    const tree = buildScreenOnce(root, owner);

    // The build owner can build a form too — it compiles those as well — so
    // being built is no longer proof of being a container screen. This is what
    // tells someone who handed `createContainerScreen` a form, and it throws
    // the message that names the fix.
    containerRoot(tree);

    return tree;
  } finally {
    if (owner.kind === 'build') {
      cleanupComponentTree(owner);
    }
  }
}

/**
 * One render, leaving the fibers it created in place.
 *
 * What {@link buildContainerTree} does between its two cleanups. Kept separate
 * for the one caller that needs the fibers afterwards: the build's liveness
 * probe reads the state they hold, and seeds the next render with it.
 *
 * @param root - The screen: a component, or an element rendering one.
 * @param owner - Who the render belongs to.
 */
export function buildScreenOnce(
  root: JSX.Element | FunctionComponent,
  owner: Owner = BUILD_OWNER,
): JSX.Element {
  registerNativeComponents();

  // The same root wrapper a form gets, so `<Text>` detects keys and measures
  // against the addon's default bundle — pinned to the default locale, since
  // one layout serves every player.
  const userRoot: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;
  const element: JSX.Element = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the expander invokes the wrapper with exactly these props
    type: DefaultTranslations as FunctionComponent,
    props: { owner, children: userRoot },
  };

  // A build render is what freezes a layout, so it is compiled by definition.
  return buildTree(element, owner, true);
}
