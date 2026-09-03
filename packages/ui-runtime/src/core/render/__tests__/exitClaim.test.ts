import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it } from 'vitest';

import { Button, isExitButton } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { useExit } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { isElement } from '../../guards';
import { BUILD_OWNER, playerOwner } from '../../fabric';
import { buildTree, cleanupComponentTree } from '../tree';

// The close button must be the same kind of element on the build's tree and
// on the runtime's: the build lowers it as a client-side exit with no entry,
// so a runtime that allocated it one would shift every press after it.

const player = { id: 'exit-claim' } as unknown as Player;

const Screen = (): JSX.Element => {
  const close = useExit();

  return Panel({
    width: 100,
    height: 40,
    children: [
      Button({ onPress: close, children: Text({ children: 'x' }) }),
      Button({ onPress: (): void => undefined, children: Text({ children: 'go' }) }),
    ],
  });
};

/** Every element of `type` in the built tree, document order. */
const buttonsOf = (node: unknown): JSX.Element[] => {
  if (!isElement(node)) {
    return [];
  }

  const own = node.type === 'button' ? [node] : [];
  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];

  return [...own, ...children.flatMap(buttonsOf)];
};

afterEach(() => {
  cleanupComponentTree(playerOwner(player));
  cleanupComponentTree(BUILD_OWNER);
});

describe('the close button', () => {
  it('is an exit for a player exactly as it is for the build', () => {
    for (const owner of [BUILD_OWNER, playerOwner(player)]) {
      const [close, go] = buttonsOf(buildTree({ type: Screen, props: {} }, owner, true));

      expect(close === undefined ? undefined : isExitButton(close)).toBe(true);
      expect(go === undefined ? undefined : isExitButton(go)).toBe(false);
    }
  });
});
