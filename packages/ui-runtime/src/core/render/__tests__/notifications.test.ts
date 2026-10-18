import type { Player } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __lastActionForm,
  __pendingShowCount,
  __resetFormMocks,
  __resolveShow,
  __setDeferredShows,
  uiManager,
} from '../../../__mocks__/@minecraft/server-ui';
import { Button } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import type { FunctionComponent, JSX } from '../../../jsx';
import { titleFor } from '../../../hosts/form/contract';
import { endRender } from '../control';
import { render } from '../lifecycle';
import { observeRenderLifecycle, renderSession, type RenderLifecycleEvent } from '../notifications';
import { registerCompiledScreen } from '../screens';

const players: Player[] = [];
const disposers: (() => void)[] = [];
let sequence = 0;

function nextPlayer(): Player {
  sequence += 1;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- render only needs an identity and input permission methods in these tests
  const player = {
    id: `lifecycle-notification-${String(sequence)}`,
    inputPermissions: {
      isPermissionCategoryEnabled: (): boolean => true,
      setPermissionCategory: vi.fn(),
    },
  } as unknown as Player;

  players.push(player);

  return player;
}

function screen(label: string, onPress: () => unknown = () => undefined): JSX.Element {
  return Screen({ children: Panel({ children: Button({ onPress, children: Text({ children: label }) }) }) });
}

function compiled(root: FunctionComponent, key: string): FunctionComponent {
  registerCompiledScreen(root, { key, title: titleFor(key.replace(':', '_')) });

  return root;
}

function watch(player: Player): RenderLifecycleEvent[] {
  const events: RenderLifecycleEvent[] = [];

  disposers.push(observeRenderLifecycle((event) => {
    if (event.session.ownerId === player.id) { events.push(event); }
  }));

  return events;
}

const tick = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0); });

beforeEach(() => {
  __setDeferredShows(true);
  uiManager.closeAllForms.mockClear();
});

afterEach(async () => {
  for (const dispose of disposers.splice(0)) { dispose(); }

  for (const player of players.splice(0)) { endRender(player); }

  await tick();
  __resetFormMocks();
  vi.restoreAllMocks();
});

describe('render lifecycle notifications', () => {
  it('renders standalone and keeps one session across state-driven presentations', async () => {
    const player = nextPlayer();
    const events = watch(player);
    const values: number[] = [];
    const Counter = compiled(() => {
      const [value, setValue] = useState(0);

      values.push(value);

      return screen(String(value), () => { setValue(value + 1); });
    }, 'notifications:counter');

    render(Counter, player);
    await tick();

    const session = renderSession(player.id);

    expect(session).toMatchObject({ ownerId: player.id, ownerKind: 'player', screenKey: 'notifications:counter', title: titleFor('notifications_counter') });
    expect(events).toEqual([{ type: 'started', session }]);
    expect(__lastActionForm()?.titleText).toBe(titleFor('notifications_counter'));
    expect(__pendingShowCount()).toBe(1);

    __resolveShow({ canceled: false, selection: 0 });
    await tick();

    expect(values).toEqual([0, 1]);
    expect(__pendingShowCount()).toBe(1);
    expect(renderSession(player.id)).toBe(session);
    expect(events).toEqual([{ type: 'started', session }]);
  });

  it('reports a replacement identity and dismisses only the current screen', async () => {
    const player = nextPlayer();
    const events = watch(player);
    const First = compiled(() => screen('first'), 'notifications:first');
    const Second = compiled(() => screen('second'), 'notifications:second');

    render(First, player);
    await tick();

    const first = renderSession(player.id);

    render(Second, player);
    await tick();

    const second = renderSession(player.id);

    expect(second?.id).not.toBe(first?.id);
    expect(second?.screenKey).toBe('notifications:second');
    expect(events).toEqual([{ type: 'started', session: first }, { type: 'replaced', previous: first, session: second }]);
    expect(__lastActionForm()?.titleText).toBe(titleFor('notifications_second'));

    __resolveShow({ canceled: true });
    await tick();

    expect(renderSession(player.id)).toBeUndefined();
    expect(events.at(-1)).toEqual({ type: 'ended', session: second, reason: 'dismissed' });
    expect(events).toHaveLength(3);
  });

  it('releases without closing native UI and ignores its late response after a successor starts', async () => {
    const player = nextPlayer();
    const events = watch(player);
    const Page = compiled(() => screen('handoff'), 'notifications:handoff');

    render(Page, player);
    await tick();

    const first = renderSession(player.id);

    endRender(player, { close: false, reason: 'released' });
    endRender(player, { close: false, reason: 'released' });

    expect(renderSession(player.id)).toBeUndefined();
    expect(events).toEqual([{ type: 'started', session: first }, { type: 'ended', session: first, reason: 'released' }]);
    expect(uiManager.closeAllForms).not.toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);

    render(Page, player);
    await tick();

    const successor = renderSession(player.id);

    expect(successor?.id).not.toBe(first?.id);
    expect(__pendingShowCount()).toBe(2);

    __resolveShow({ canceled: true });
    await tick();

    expect(renderSession(player.id)).toBe(successor);
    expect(__pendingShowCount()).toBe(1);
    expect(events).toEqual([
      { type: 'started', session: first },
      { type: 'ended', session: first, reason: 'released' },
      { type: 'started', session: successor },
    ]);
  });

  it('replays current sessions, disposes observers and isolates listener failures', async () => {
    const player = nextPlayer();
    const First = compiled(() => screen('replay'), 'notifications:replay');
    const Second = compiled(() => screen('continued'), 'notifications:continued');

    render(First, player);
    await tick();

    const initial = renderSession(player.id);
    const replayed: RenderLifecycleEvent[] = [];
    const dispose = observeRenderLifecycle((event) => { replayed.push(event); }, { replay: true });

    disposers.push(dispose);
    expect(replayed).toEqual([{ type: 'started', session: initial }]);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    disposers.push(observeRenderLifecycle(() => { throw new Error('observer failure'); }));

    const healthy = watch(player);

    render(Second, player);
    await tick();

    const current = renderSession(player.id);

    expect(healthy).toEqual([{ type: 'replaced', previous: initial, session: current }]);
    expect(replayed).toHaveLength(2);
    expect(warn).toHaveBeenCalled();
    expect(__lastActionForm()?.titleText).toBe(titleFor('notifications_continued'));
    expect(__pendingShowCount()).toBe(1);

    dispose();
    dispose();
    endRender(player);
    await tick();

    expect(replayed).toHaveLength(2);
    expect(healthy.at(-1)).toEqual({ type: 'ended', session: current, reason: 'closed' });
  });

  it('closes only the requested player and preserves another player session', async () => {
    const left = nextPlayer();
    const right = nextPlayer();
    const leftEvents = watch(left);
    const rightEvents = watch(right);
    const Page = compiled(() => screen('shared'), 'notifications:shared');

    render(Page, left);
    render(Page, right);
    await tick();

    const leftSession = renderSession(left.id);
    const rightSession = renderSession(right.id);

    endRender(left);
    await tick();

    expect(uiManager.closeAllForms).toHaveBeenCalledExactlyOnceWith(left);
    expect(renderSession(left.id)).toBeUndefined();
    expect(renderSession(right.id)).toBe(rightSession);
    expect(__pendingShowCount()).toBe(1);
    expect(leftEvents).toEqual([{ type: 'started', session: leftSession }, { type: 'ended', session: leftSession, reason: 'closed' }]);
    expect(rightEvents).toEqual([{ type: 'started', session: rightSession }]);

    __resolveShow({ canceled: true });
    await tick();

    expect(rightEvents.at(-1)).toEqual({ type: 'ended', session: rightSession, reason: 'dismissed' });
  });

  it('reports a failed build as an ended server session and permits recovery', async () => {
    const player = nextPlayer();
    const events = watch(player);
    const Broken = compiled(() => { throw new Error('build failed'); }, 'notifications:broken');
    const Recovery = compiled(() => screen('recovered'), 'notifications:recovery');

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(Broken, player);

    expect(events.map(event => event.type)).toEqual(['started', 'ended']);
    expect(events[1]).toMatchObject({ type: 'ended', reason: 'error', session: { screenKey: 'notifications:broken' } });
    expect(renderSession(player.id)).toBeUndefined();
    expect(__pendingShowCount()).toBe(0);

    render(Recovery, player);
    await tick();

    expect(events.at(-1)).toEqual({ type: 'started', session: renderSession(player.id) });
    expect(renderSession(player.id)?.screenKey).toBe('notifications:recovery');
    expect(__pendingShowCount()).toBe(1);
  });

  it('keeps a successor opened by an ended observer active', async () => {
    const player = nextPlayer();
    const First = compiled(() => screen('first'), 'notifications:observer-first');
    const Next = compiled(() => screen('next'), 'notifications:observer-next');

    disposers.push(observeRenderLifecycle((event) => {
      if (event.type === 'ended' && event.session.ownerId === player.id
        && event.session.screenKey === 'notifications:observer-first') { render(Next, player); }
    }));
    render(First, player);
    await tick();
    endRender(player);
    await tick();

    const successor = renderSession(player.id);

    expect(successor?.screenKey).toBe('notifications:observer-next');
    expect(__lastActionForm()?.titleText).toBe(titleFor('notifications_observer-next'));
    expect(uiManager.closeAllForms).toHaveBeenCalledExactlyOnceWith(player);
    expect(__pendingShowCount()).toBe(1);
    expect(renderSession(player.id)).toBe(successor);
  });
});
