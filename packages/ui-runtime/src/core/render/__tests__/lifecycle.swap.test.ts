import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import {
  FormRejectError,
  FormRejectReason,
  __pendingShowCount,
  __rejectShow,
  __resetFormMocks,
  __resolveShow,
  __setDeferredShows,
  uiManager,
} from '../../../__mocks__/@minecraft/server-ui';
import { Button } from '../../../components/Button';
import { Form } from '../../../components/Form';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { useEffect, useExit, useState } from '../../../hooks';
import type { FunctionComponent, JSX } from '../../../jsx';
import { getFibersForPlayer } from '../../fabric';
import { render } from '../lifecycle';
import { getPlayerRoot } from '../session';

/**
 * Cross-app handoff ("one UI slot per player"): render() during a live session
 * swaps the new app into the existing present chain instead of spawning a
 * competing one. These tests cover the original nondeterministic race (gear
 * button → exit() + async render of a second app), swap-vs-ESC semantics, the
 * chain-token guard against stale continuations, and per-player isolation.
 */

function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test element factory; the { type, props } shape is a JSX.Element at runtime
  return { type, props } as JSX.Element;
}

interface TestPlayer {
  player: Player;
  /** Spy over inputPermissions.setPermissionCategory: 2 calls = lock, +2 = restore. */
  permissionSpy: ReturnType<typeof vi.fn>;
}

function makePlayer(id: string): TestPlayer {
  const permissionSpy = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub: id + the two inputPermissions methods the input lock uses
  const player = {
    id,
    inputPermissions: {
      isPermissionCategoryEnabled: (): boolean => true,
      setPermissionCategory: permissionSpy,
    },
  } as unknown as Player;

  return { player, permissionSpy };
}

/** Flush the full microtask queue (and one macrotask turn). */
function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** A minimal ActionForm app: one button at ordinal 0 wired to `onPress`. */
function screenOf(label: string, onPress: () => unknown): JSX.Element {
  return el(Panel, {
    width: 220,
    height: 120,
    children: [el(Button, { onPress, children: el(Text, { children: label }) })],
  });
}

/** Press the oldest pending ActionForm's first button. */
function press(): void {
  __resolveShow({ canceled: false, selection: 0 });
}

/** ESC the oldest pending form. */
function esc(): void {
  __resolveShow({ canceled: true });
}

afterEach(() => {
  __resetFormMocks();
  uiManager.closeAllForms.mockClear();
  vi.restoreAllMocks();
});

describe('render() swap — cross-app handoff', () => {
  it('T1: render(B) landing BEFORE the verdict swaps into the live chain; B keeps state on its first press', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t1');
    const cleanupA = vi.fn();
    const bValues: number[] = [];

    const AppB: FunctionComponent = () => {
      const [count, setCount] = useState(0);

      bValues.push(count);

      return screenOf(`B:${count}`, () => {
        setCount(count + 1);
      });
    };

    const AppA: FunctionComponent = () => {
      const exit = useExit();

      useEffect(() => cleanupA, []);

      // The graves gear button: exit + fire-and-forget open of the next app.
      // queueMicrotask lands the render BEFORE the interactive verdict.
      return screenOf('A', () => {
        exit();
        queueMicrotask(() => {
          render(AppB, player);
        });
      });
    };

    render(AppA, player);
    await tick();
    expect(__pendingShowCount()).toBe(1);

    press();
    await tick();

    // Swap happened inside the one chain: A cleaned up, B on screen, input lock
    // never dropped (2 calls = the initial lock, no restore, no re-lock).
    expect(cleanupA).toHaveBeenCalledTimes(1);
    expect(permissionSpy).toHaveBeenCalledTimes(2);
    expect(bValues).toEqual([0]);
    expect(__pendingShowCount()).toBe(1);

    // THE regression: B's first press must not be swallowed by a wiped session.
    press();
    await tick();
    expect(bValues).toEqual([0, 1]);
    expect(__pendingShowCount()).toBe(1);
  });

  it('T2: render(B) landing AFTER cleanup takes the fresh path (one lock flash), same end state', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t2');
    const bValues: number[] = [];

    const AppB: FunctionComponent = () => {
      const [count, setCount] = useState(0);

      bValues.push(count);

      return screenOf(`B:${count}`, () => {
        setCount(count + 1);
      });
    };

    const AppA: FunctionComponent = () => {
      const exit = useExit();

      // setTimeout lands the render after the whole cleanup settled.
      return screenOf('A', () => {
        exit();
        setTimeout(() => {
          render(AppB, player);
        }, 0);
      });
    };

    render(AppA, player);
    await tick();
    press();
    await tick();
    await tick();

    // Fresh path: lock (2) + restore (2) + re-lock (2).
    expect(permissionSpy).toHaveBeenCalledTimes(6);
    expect(bValues).toEqual([0]);
    expect(__pendingShowCount()).toBe(1);

    press();
    await tick();
    expect(bValues).toEqual([0, 1]);
  });

  it('T2b: render(B) landing between the verdict and its chain continuation still swaps cleanly', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t2b');
    const bodyB = vi.fn();
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };

    const AppA: FunctionComponent = () => {
      const exit = useExit();

      // Three .then hops: the verdict has computed 'cleanup' (A's dead fiber was
      // still registered), but the chain continuation has not consumed it yet.
      return screenOf('A', () => {
        exit();
        void Promise.resolve()
          .then(() => undefined)
          .then(() => undefined)
          .then(() => {
            render(AppB, player);
          });
      });
    };

    render(AppA, player);
    await tick();
    press();
    await tick();

    // The pending swap absorbs the stale 'cleanup' verdict: lock never dropped.
    expect(permissionSpy).toHaveBeenCalledTimes(2);
    expect(bodyB).toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);
  });

  it('T3: an external swap closes the form without tearing down; a real ESC still tears down', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t3');
    const bodyB = vi.fn();
    const AppA: FunctionComponent = () => screenOf('A', () => undefined);
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };

    render(AppA, player);
    await tick();
    expect(__pendingShowCount()).toBe(1);

    // External handoff (e.g. an item-use handler) while A's form is on screen.
    render(AppB, player);
    expect(uiManager.closeAllForms).toHaveBeenCalledTimes(1);
    await tick();

    expect(bodyB).toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);
    expect(permissionSpy).toHaveBeenCalledTimes(2);

    // ESC on B is the player dismissing: full teardown.
    esc();
    await tick();
    expect(permissionSpy).toHaveBeenCalledTimes(4);
    expect(getFibersForPlayer(player)).toHaveLength(0);
    expect(getPlayerRoot(player)).toBeUndefined();
    expect(__pendingShowCount()).toBe(0);
  });

  it('T4: a swap-cancel skips the modal onCancel; a real dismissal still fires it', async () => {
    __setDeferredShows(true);

    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    // Swap case: the old modal app's onCancel must NOT run.
    const swap = makePlayer('t4-swap');
    const ModalApp: FunctionComponent = () => el(Form, {
      onSubmit,
      onCancel,
      children: [
        el(Form.Toggle, { name: 'x', defaultValue: false }),
        el(Form.Button, { type: 'submit', label: 'Save' }),
      ],
    });
    const bodyB = vi.fn();
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };

    render(ModalApp, swap.player);
    await tick();
    expect(__pendingShowCount()).toBe(1);

    render(AppB, swap.player);
    await tick();
    expect(onCancel).not.toHaveBeenCalled();
    expect(bodyB).toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);

    // Control case on a second player: a real dismissal fires onCancel.
    const dismiss = makePlayer('t4-dismiss');

    render(ModalApp, dismiss.player);
    await tick();
    __resolveShow({ canceled: true }, 1);
    await tick();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('T5: double swap before absorption — last root wins, the middle app never runs', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t5');
    const bodyB = vi.fn();
    const bodyC = vi.fn();
    const AppA: FunctionComponent = () => screenOf('A', () => undefined);
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };
    const AppC: FunctionComponent = () => {
      bodyC();

      return screenOf('C', () => undefined);
    };

    render(AppA, player);
    await tick();
    render(AppB, player);
    render(AppC, player);
    await tick();

    expect(bodyB).not.toHaveBeenCalled();
    expect(bodyC).toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);

    esc();
    await tick();
    expect(getPlayerRoot(player)).toBeUndefined();
    expect(permissionSpy).toHaveBeenCalledTimes(4);
  });

  it('T6: no hook-state bleed between same-named roots across a handoff', async () => {
    __setDeferredShows(true);

    const { player } = makePlayer('t6');
    const events: string[] = [];
    const aValues: string[] = [];
    const bValues: string[] = [];

    const AppA: FunctionComponent = () => {
      const [value, setValue] = useState('A-initial');
      const exit = useExit();

      aValues.push(value);
      useEffect(() => {
        return () => {
          events.push('cleanup-A');
        };
      }, []);

      return screenOf(value, () => {
        if (value === 'A-initial') {
          setValue('A-changed');
        } else {
          exit();
          queueMicrotask(() => {
            render(AppB, player);
          });
        }
      });
    };
    const AppB: FunctionComponent = () => {
      const [value] = useState('B-initial');

      bValues.push(value);
      useEffect(() => {
        events.push('mount-B');
      }, []);

      return screenOf(value, () => undefined);
    };

    // Both roots share the component name — same fiber path under the wrapper.
    Object.defineProperty(AppA, 'name', { value: 'Screen' });
    Object.defineProperty(AppB, 'name', { value: 'Screen' });

    render(AppA, player);
    await tick();
    press();
    await tick();
    expect(aValues).toEqual(['A-initial', 'A-changed']);

    press();
    await tick();

    // B must see ITS initial state, not A's mutated slot at the same fiber path,
    // and A must be cleaned up before B mounts.
    expect(bValues).toEqual(['B-initial']);
    expect(events).toEqual(['cleanup-A', 'mount-B']);
  });

  it('T7: background logic passes run for the new app after an exit()-handoff', async () => {
    __setDeferredShows(true);

    const { player } = makePlayer('t7');
    const bodyB = vi.fn();
    let setterB: ((value: number) => void) | undefined;

    const AppB: FunctionComponent = () => {
      const [count, setCount] = useState(0);

      bodyB();
      setterB = setCount;

      return screenOf(`B:${count}`, () => undefined);
    };
    const AppA: FunctionComponent = () => {
      const exit = useExit();

      return screenOf('A', () => {
        exit();
        queueMicrotask(() => {
          render(AppB, player);
        });
      });
    };

    render(AppA, player);
    await tick();
    press();
    await tick();

    const buildsAfterHandoff = bodyB.mock.calls.length;

    // A state change outside any interaction schedules a background build; a
    // stale dead fiber from A would silently block it before the fix.
    setterB?.(5);
    await tick();
    expect(bodyB.mock.calls.length).toBe(buildsAfterHandoff + 1);
    expect(__pendingShowCount()).toBe(1);
  });

  it('T8: a throwing build tears the session down (fresh and swap paths) and the player can recover', async () => {
    __setDeferredShows(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { player, permissionSpy } = makePlayer('t8');
    const Throwing: FunctionComponent = () => {
      throw new Error('boom');
    };
    const AppA: FunctionComponent = () => screenOf('A', () => undefined);
    const AppD: FunctionComponent = () => screenOf('D', () => undefined);

    // (a) Fresh render that throws: no frozen player, session cleared.
    render(Throwing, player);
    expect(getPlayerRoot(player)).toBeUndefined();
    expect(permissionSpy).toHaveBeenCalledTimes(4);

    // (b) Swap to a throwing app: absorption tears down instead of stranding.
    render(AppA, player);
    await tick();
    render(Throwing, player);
    await tick();
    expect(getPlayerRoot(player)).toBeUndefined();
    expect(getFibersForPlayer(player)).toHaveLength(0);

    // Recovery: a later app renders normally.
    render(AppD, player);
    await tick();
    expect(__pendingShowCount()).toBe(1);
  });

  it('T9: a stale chain tail (exit-from-effect + immediate new app) cannot kill the successor', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t9');
    let exitA: (() => void) | undefined;

    const AppA: FunctionComponent = () => {
      exitA = useExit();

      return screenOf('A', () => undefined);
    };
    const bodyC = vi.fn();
    const AppC: FunctionComponent = () => {
      bodyC();

      return screenOf('C', () => undefined);
    };

    render(AppA, player);
    await tick();
    expect(__pendingShowCount()).toBe(1);

    // Non-transactional exit: tears down + closeAllForms resolves A's show; its
    // 'cleanup' continuation is now a stale tail...
    exitA?.();
    // ...and a new app starts before that tail lands.
    render(AppC, player);
    await tick();

    // The tail must not end C's chain or clean C up.
    expect(bodyC).toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);
    expect(getFibersForPlayer(player).length).toBeGreaterThan(0);
    // lock A (2) + restore on exit (2) + lock C (2), and nothing after.
    expect(permissionSpy).toHaveBeenCalledTimes(6);
  });

  it('T10: a rejected show() (PlayerQuit) ends the chain with best-effort cleanup and no state leak', async () => {
    __setDeferredShows(true);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { player } = makePlayer('t10');
    const aValues: string[] = [];
    const AppA: FunctionComponent = () => {
      const [value] = useState('initial');

      aValues.push(value);

      return screenOf(value, () => undefined);
    };

    render(AppA, player);
    await tick();
    __rejectShow(new FormRejectError('PlayerQuit', FormRejectReason.PlayerQuit));
    await tick();

    expect(getPlayerRoot(player)).toBeUndefined();
    expect(getFibersForPlayer(player)).toHaveLength(0);

    // Rejoining renders fresh — mount-phase state, nothing resurrected.
    render(AppA, player);
    await tick();
    expect(aValues).toEqual(['initial', 'initial']);
    expect(__pendingShowCount()).toBe(1);
  });

  it('T11: handoff inside the interactive transaction needs no exit() and never drops the lock', async () => {
    __setDeferredShows(true);

    const { player, permissionSpy } = makePlayer('t11');
    const bodyB = vi.fn();
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };
    // The openUi contract: the presser returns the promise, so the swap lands
    // inside the transaction — deterministic, flash-free, no exit() involved.
    const AppA: FunctionComponent = () => screenOf('A', async () => {
      await Promise.resolve();
      render(AppB, player);
    });

    render(AppA, player);
    await tick();
    press();
    await tick();

    expect(bodyB).toHaveBeenCalled();
    expect(permissionSpy).toHaveBeenCalledTimes(2);
    expect(__pendingShowCount()).toBe(1);
  });

  it('T12: a dead app\'s setter between swap and absorption cannot mount the new app early', async () => {
    __setDeferredShows(true);

    const { player } = makePlayer('t12');
    let setterA: ((value: string) => void) | undefined;
    const AppA: FunctionComponent = () => {
      const [value, setValue] = useState('a');

      setterA = setValue;

      return screenOf(value, () => undefined);
    };
    const bodyB = vi.fn();
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };

    render(AppA, player);
    await tick();
    render(AppB, player);

    // A straggler from the dead app fires before the chain absorbed the swap.
    setterA?.('poke');
    expect(bodyB).not.toHaveBeenCalled();

    await tick();
    expect(bodyB).toHaveBeenCalledTimes(1);
  });

  it('T13: a \'none\' outcome while a swap is pending still presents the new app', async () => {
    __setDeferredShows(true);

    const { player } = makePlayer('t13');
    const AppA: FunctionComponent = () => screenOf('A', () => undefined);
    const bodyB = vi.fn();
    const AppB: FunctionComponent = () => {
      bodyB();

      return screenOf('B', () => undefined);
    };

    render(AppA, player);
    await tick();

    // A selection with no registered callback resolves 'none'; the swap that
    // lands right after must not strand on the ended chain.
    __resolveShow({ canceled: false, selection: 99 });
    render(AppB, player);
    await tick();

    expect(bodyB).toHaveBeenCalled();
    expect(__pendingShowCount()).toBe(1);
  });

  it('T14: a swap for one player never touches another player\'s session', async () => {
    __setDeferredShows(true);

    const p1 = makePlayer('t14-one');
    const p2 = makePlayer('t14-two');
    const bodyA2 = vi.fn();
    const AppA1: FunctionComponent = () => screenOf('A1', () => undefined);
    const AppA2: FunctionComponent = () => {
      bodyA2();

      return screenOf('A2', () => undefined);
    };
    const AppB: FunctionComponent = () => screenOf('B', () => undefined);

    render(AppA1, p1.player);
    render(AppA2, p2.player);
    await tick();
    expect(__pendingShowCount()).toBe(2);

    const p2Fibers = getFibersForPlayer(p2.player).length;

    render(AppB, p1.player);
    await tick();

    // p1 swapped to B; p2's form, fibers, lock, and build count are untouched.
    expect(__pendingShowCount()).toBe(2);
    expect(getFibersForPlayer(p2.player).length).toBe(p2Fibers);
    expect(bodyA2).toHaveBeenCalledTimes(1);
    expect(p2.permissionSpy).toHaveBeenCalledTimes(2);
    expect(p1.permissionSpy).toHaveBeenCalledTimes(2);
  });
});
