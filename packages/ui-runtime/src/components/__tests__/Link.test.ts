import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it } from 'vitest';
import type { PressEvent } from '../../core/events';
import { clearHistory } from '../../core/history';
import { setNavigator, type NavigateOptions } from '../../core/navigate';
import { Link, linkTarget } from '../Link';
import { Text } from '../Text';

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
const player = { id: 'link-params' } as unknown as Player;

afterEach(() => {
  setNavigator(undefined);
  clearHistory(player.id);
});

describe('a link\'s params', () => {
  it('are recorded on the built element, so the build reads them with the key', () => {
    const element = Link({ to: 'shop:item', params: { id: 'diamond', price: 64 }, replace: true, children: Text({ children: 'go' }) });

    expect(linkTarget(element)).toEqual({ to: 'shop:item', params: { id: 'diamond', price: 64 }, replace: true });
  });

  it('are absent from a link that has none', () => {
    expect(linkTarget(Link({ to: 'shop:item', children: Text({ children: 'go' }) }))).toEqual({ to: 'shop:item' });
  });

  it('go nowhere on the way back, which opens no screen of its own', () => {
    expect(linkTarget(Link({ back: true, params: { id: 'diamond' }, children: Text({ children: 'back' }) }))).toEqual({ back: true });
  });

  it('are what a press navigates with', () => {
    const seen: { key: string; options: NavigateOptions }[] = [];

    setNavigator((key, _player, options) => {
      seen.push({ key, options });

      return true;
    });

    const element = Link({ to: 'shop:item', params: { id: 'diamond' }, children: Text({ children: 'go' }) });
    const onPress = element.props['onPress'];

    expect(typeof onPress).toBe('function');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the press reads only the player
    (onPress as (event: PressEvent) => void)({ player } as unknown as PressEvent);

    expect(seen).toEqual([{ key: 'shop:item', options: { params: { id: 'diamond' } } }]);
  });
});
