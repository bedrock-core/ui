import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { useEffect, useReducer, useState } from '../../../hooks';
import { playerOwner } from '../../fabric';
import * as session from '../session';
import { buildTree, cleanupComponentTree } from '../tree';

const owner = playerOwner({ id: 'hook-lifetime' } as Player);
type Kind = 'state' | 'reducer';

function mount(kind: Kind, applied: () => void, cleanup?: (update: () => void) => void): () => void {
  let update!: () => void;
  const App = () => {
    if (kind === 'state') {
      const [, set] = useState(0);

      update = () => set(value => { applied(); return value + 1; });
    } else {
      const [, dispatch] = useReducer((value: number, action: number) => { applied(); return value + action; }, 0);

      update = () => dispatch(1);
    }

    useEffect(() => () => { cleanup?.(update); }, []);

    return Screen({ children: Panel({ width: 10, height: 10 }) });
  };
  const root = { type: App, props: {} };

  session.setSessionRoot(owner, root);
  buildTree(root, owner);

  return update;
}

afterEach(() => {
  cleanupComponentTree(owner);
  session.clearSession(owner);
  vi.restoreAllMocks();
});

describe.each(['state', 'reducer'] as const)('%s hook lifetime', (kind) => {
  it.each([false, true])('ignores a retired update with successor mounted = %s', async (successor) => {
    const applied = vi.fn();
    const update = mount(kind, applied);
    const rebuild = vi.fn();
    const schedule = vi.spyOn(session, 'scheduleLogicPass');

    cleanupComponentTree(owner);
    session.clearSession(owner);

    if (successor) {
      const Next = () => Screen({ children: Panel({ width: 10, height: 10 }) });
      const root = { type: Next, props: {} };

      session.setSessionRoot(owner, root);
      buildTree(root, owner);
      session.setBuildRunner(owner, rebuild);
    }

    schedule.mockClear();
    update();
    await Promise.resolve();
    expect(applied).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expect(rebuild).not.toHaveBeenCalled();
  });

  it('retires the hook before effect cleanup can invoke it', async () => {
    const applied = vi.fn();
    const cleaned = vi.fn((update: () => void) => update());
    const schedule = vi.spyOn(session, 'scheduleLogicPass');

    mount(kind, applied, cleaned);
    schedule.mockClear();
    cleanupComponentTree(owner);
    await Promise.resolve();
    expect(cleaned).toHaveBeenCalledOnce();
    expect(applied).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });
});
