import type { Player } from '@minecraft/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  __lastActionForm, __resetFormMocks, __resolveShow, __setDeferredShows,
} from '../../../__mocks__/@minecraft/server-ui';
import { registerNativeComponents } from '../../../components';
import { Button } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { playerOwner } from '../../../core/fabric';
import { buildTree } from '../../../core/render/tree';
import type { JSX } from '../../../jsx';
import { titleFor } from '../contract';
import { presentCompiledForm } from '../runtime';

beforeAll(() => {
  registerNativeComponents();
});

afterEach(() => {
  __resetFormMocks();
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
const player = { id: 'compiled-form' } as unknown as Player;

const build = (screen: () => JSX.Element): JSX.Element =>
  buildTree({ type: screen, props: {} }, playerOwner(player));

const TITLE = titleFor('drav0011_shop_home');

describe('presenting a compiled form', () => {
  it('names the screen in the title, which is how the client finds its layout', async () => {
    const tree = build((): JSX.Element => Panel({ children: [Text({ children: 'static' })] }));

    await presentCompiledForm(player, tree, TITLE);

    expect(__lastActionForm()?.titleText).toBe('bcuiv0008core1:drav0011_shop_home');
  });

  it('writes nothing for a screen that is only static', async () => {
    const tree = build((): JSX.Element => Panel({ children: [Text({ children: 'BEDROCK CORE' })] }));

    await presentCompiledForm(player, tree, TITLE);

    // The layout is already in the pack; a static screen has nothing to say.
    expect(__lastActionForm()?.buttons).toEqual([]);
  });

  it('carries a live string whole — a form entry has no alphabet to lose', async () => {
    const tree = build((): JSX.Element => Panel({
      children: [Text({ maxLength: 24, children: '§aholding §fdiamond' })],
    }));

    await presentCompiledForm(player, tree, TITLE);

    expect(__lastActionForm()?.buttons).toEqual(['§aholding §fdiamond']);
  });

  it('cuts a live string to the room the screen reserved for it', async () => {
    const tree = build((): JSX.Element => Panel({
      children: [Text({ maxLength: 4, children: 'far too long' })],
    }));

    await presentCompiledForm(player, tree, TITLE);

    expect(__lastActionForm()?.buttons).toEqual(['far ']);
  });

  it('says whether each press may happen, which is all a press entry carries', async () => {
    const tree = build((): JSX.Element => Panel({
      children: [
        Button({ onPress: () => undefined, children: Text({ children: 'go' }) }),
        Button({ enabled: false, onPress: () => undefined, children: Text({ children: 'stop' }) }),
      ],
    }));

    await presentCompiledForm(player, tree, TITLE);

    expect(__lastActionForm()?.buttons).toEqual(['1', '0']);
  });

  it('runs the handler of the entry the engine named', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const tree = build((): JSX.Element => Panel({
      children: [
        Button({ onPress: first, children: Text({ children: 'one' }) }),
        Button({ onPress: second, children: Text({ children: 'two' }) }),
      ],
    }));

    __setDeferredShows(true);

    const outcome = presentCompiledForm(player, tree, TITLE);

    __resolveShow({ canceled: false, selection: 1 });

    await outcome;

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ player });
  });

  it('keeps a press index still when the screen gains text, since cells are placed first', async () => {
    const pressed = vi.fn();
    const tree = build((): JSX.Element => Panel({
      children: [
        Text({ maxLength: 8, children: 'live' }),
        Button({ onPress: pressed, children: Text({ children: 'go' }) }),
      ],
    }));

    __setDeferredShows(true);

    const outcome = presentCompiledForm(player, tree, TITLE);

    // The button is written first even though the text is above it on screen.
    expect(__lastActionForm()?.buttons).toEqual(['1', 'live']);

    __resolveShow({ canceled: false, selection: 0 });

    await outcome;

    expect(pressed).toHaveBeenCalledOnce();
  });

  it('tears the session down when the player dismisses', async () => {
    const tree = build((): JSX.Element => Panel({
      children: [Button({ onPress: () => undefined, children: Text({ children: 'go' }) })],
    }));

    __setDeferredShows(true);

    const outcome = presentCompiledForm(player, tree, TITLE);

    __resolveShow({ canceled: true });

    await expect(outcome).resolves.toBe('cleanup');
  });
});
