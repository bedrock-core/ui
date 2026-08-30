import { analyze, visiblesAt } from '../../core/ir';
import { bakedTexts, shapeOf } from '../../core/ir/probe';
import type { CompiledSnapshot } from '../../core/render/screens';
import type { JSX } from '../../jsx';

/**
 * The runtime half of the liveness guard: making an inference miss loud.
 *
 * Probing is not proof. A value that only changes past a threshold no probe
 * crossed is baked, and a compiled screen then shows the build's value forever
 * — correctly laid out, silently wrong. The build cannot see that; the render
 * that finally crosses the threshold can. So with `debug: true` every present
 * diffs this render against what the build recorded, and anything that moved
 * where nothing was reserved becomes one warning naming the screen, the
 * element and the fix.
 *
 * Two checks, matching the two ways a compiled screen can drift:
 *
 * 1. The claim shape. A different fingerprint means the entry numbering no
 *    longer matches the baked `collection_index`es — presses land on the
 *    wrong handlers from here on, which is worth shouting about.
 * 2. A baked string that changed. The build froze it; the pack will show the
 *    frozen value whatever the server now computes.
 *
 * A live string past its reservation is not here because it cannot be seen
 * here: `<Text>` slices to `maxLength` when the element is created, so the
 * overflow never reaches a tree a present could diff.
 */
export const debugDiff = (tree: JSX.Element, snapshot: CompiledSnapshot, screen: string): string[] => {
  const lines: string[] = [];
  // Carrier-aware, the same way the build fingerprinted it: the snapshot's
  // own ordinals mark the visibles, so the two strings compare like for like.
  const shape = shapeOf(tree, analyze(tree, visiblesAt(tree, snapshot.vis)));

  if (shape !== snapshot.shape) {
    lines.push(
      `[ui] debug ${screen}: the claim shape changed since the build.\n`
      + `  compiled: ${snapshot.shape}\n`
      + `  rendered: ${shape}\n`
      + '  Entries no longer line up with the baked layout; presses and values may land on the wrong elements.',
    );
  }

  bakedTexts(tree).forEach((after, position) => {
    const before = snapshot.baked[position];

    if (before !== undefined && after !== before) {
      lines.push(
        `[ui] debug ${screen}: baked <Text> #${position} is "${after}" this render but was compiled as "${before}".\n`
        + '  The pack shows the compiled value. Give it maxLength={n} to carry it live.',
      );
    }
  });

  return lines;
};
