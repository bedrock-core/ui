import type { FunctionComponent, JSX } from '../jsx';

export const TREE_BOUNDARY_TYPE = 'expanded-tree-boundary';

export interface TreeBoundaryProps {
  readonly children?: JSX.Node;
  /** Receives fully expanded children before layout, inheritance and host allocation. */
  readonly transform: (children: readonly JSX.Element[]) => JSX.Element;
}

/** Lets a component library compose already-expanded controls without owning the renderer. */
export const TreeBoundary: FunctionComponent<TreeBoundaryProps> = props => ({ type: TREE_BOUNDARY_TYPE, props: { ...props } });
