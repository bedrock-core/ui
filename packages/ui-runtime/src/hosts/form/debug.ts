import { analyze, visiblesAt } from '../../core/ir';
import { shapeOf } from '../../core/ir/probe';
import type { CompiledSnapshot } from '../../core/render/screens';
import type { JSX } from '../../jsx';

/** Reports structural drift that changes compiled entry addresses. */
export const debugDiff = (tree: JSX.Element, snapshot: CompiledSnapshot, screen: string): string[] => {
  const lines: string[] = [];
  // Carrier-aware, the same way the build fingerprinted it: the snapshot's
  // own ordinals mark the visibles, so the two strings compare like for like.
  const shape = shapeOf(tree, analyze(tree, visiblesAt(tree, snapshot.vis), undefined, snapshot.texts));

  if (shape !== snapshot.shape) {
    lines.push(
      `[ui] debug ${screen}: the claim shape changed since the build.\n`
      + `  compiled: ${snapshot.shape}\n`
      + `  rendered: ${shape}\n`
      + '  Entries no longer line up with the baked layout; presses and values may land on the wrong elements.',
    );
  }

  return lines;
};
