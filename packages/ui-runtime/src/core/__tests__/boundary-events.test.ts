import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createBoundaryEventState,
  subscribeToBoundary,
  emitBoundaryResolution,
  areAllBoundariesResolved,
  getBoundaryStatus,
  getResolvedBoundaries,
  resetBoundaryEventState,
  type BoundaryEventState,
  type BoundaryResolutionEvent
} from '../fabric/boundary-events';

describe('BoundaryEvents', () => {
  let events: BoundaryEventState;

  beforeEach(() => {
    events = createBoundaryEventState();
  });

  describe('createBoundaryEventState', () => {
    it('creates empty state', () => {
      expect(events.listeners.size).toBe(0);
      expect(events.resolved.size).toBe(0);
    });
  });

  describe('subscribeToBoundary', () => {
    it('calls listener when boundary resolves', () => {
      const listener = vi.fn();
      subscribeToBoundary(events, 'boundary-1', listener);

      emitBoundaryResolution(events, 'boundary-1', true);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        boundaryId: 'boundary-1',
        resolved: true,
      }));
    });

    it('returns unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToBoundary(events, 'boundary-1', listener);

      unsubscribe();
      emitBoundaryResolution(events, 'boundary-1', true);

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners per boundary', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      subscribeToBoundary(events, 'boundary-1', listener1);
      subscribeToBoundary(events, 'boundary-1', listener2);

      emitBoundaryResolution(events, 'boundary-1', true);

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('supports different listeners for different boundaries', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      subscribeToBoundary(events, 'boundary-1', listener1);
      subscribeToBoundary(events, 'boundary-2', listener2);

      emitBoundaryResolution(events, 'boundary-1', true);

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('stores listeners in state', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      expect(events.listeners.has('boundary-1')).toBe(true);
      expect(events.listeners.get('boundary-1')).toHaveLength(1);
    });
  });

  describe('emitBoundaryResolution', () => {
    it('passes event with correct properties', () => {
      const listener = vi.fn();
      subscribeToBoundary(events, 'boundary-1', listener);

      emitBoundaryResolution(events, 'boundary-1', true);

      const event = listener.mock.calls[0][0] as BoundaryResolutionEvent;
      expect(event.boundaryId).toBe('boundary-1');
      expect(event.resolved).toBe(true);
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('emits event with success=false on failure', () => {
      const listener = vi.fn();
      subscribeToBoundary(events, 'boundary-1', listener);

      emitBoundaryResolution(events, 'boundary-1', false);

      const event = listener.mock.calls[0][0] as BoundaryResolutionEvent;
      expect(event.resolved).toBe(false);
    });

    it('marks boundary as resolved in state', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', true);

      expect(events.resolved.has('boundary-1')).toBe(true);
    });

    it('ignores second emission for same boundary', () => {
      const listener = vi.fn();
      subscribeToBoundary(events, 'boundary-1', listener);

      emitBoundaryResolution(events, 'boundary-1', true);
      emitBoundaryResolution(events, 'boundary-1', false);

      expect(listener).toHaveBeenCalledOnce();
      const event = listener.mock.calls[0][0] as BoundaryResolutionEvent;
      expect(event.resolved).toBe(true); // First one wins
    });

    it('handles listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const successListener = vi.fn();

      subscribeToBoundary(events, 'boundary-1', errorListener);
      subscribeToBoundary(events, 'boundary-1', successListener);

      // Should not throw
      expect(() => {
        emitBoundaryResolution(events, 'boundary-1', true);
      }).not.toThrow();

      // Both listeners should have been called despite error
      expect(errorListener).toHaveBeenCalledOnce();
      expect(successListener).toHaveBeenCalledOnce();
    });

    it('handles emission for boundary with no listeners', () => {
      expect(() => {
        emitBoundaryResolution(events, 'unknown-boundary', true);
      }).not.toThrow();

      expect(events.resolved.has('unknown-boundary')).toBe(true);
    });
  });

  describe('areAllBoundariesResolved', () => {
    it('returns true when all boundaries resolved', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      subscribeToBoundary(events, 'boundary-2', () => {});

      emitBoundaryResolution(events, 'boundary-1', true);
      emitBoundaryResolution(events, 'boundary-2', true);

      const result = areAllBoundariesResolved(events, ['boundary-1', 'boundary-2']);
      expect(result).toBe(true);
    });

    it('returns false when some boundaries not resolved', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', true);

      const result = areAllBoundariesResolved(events, ['boundary-1', 'boundary-2']);
      expect(result).toBe(false);
    });

    it('returns true for empty array', () => {
      const result = areAllBoundariesResolved(events, []);
      expect(result).toBe(true);
    });

    it('works with unresolved boundaries not yet emitted', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', true);

      // boundary-2 was never registered
      const result = areAllBoundariesResolved(events, ['boundary-1', 'boundary-2']);
      expect(result).toBe(false);
    });
  });

  describe('getBoundaryStatus', () => {
    it('returns pending for unresolved boundary', () => {
      const status = getBoundaryStatus(events, 'boundary-1');
      expect(status).toBe('pending');
    });

    it('returns resolved for resolved boundary', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', true);

      const status = getBoundaryStatus(events, 'boundary-1');
      expect(status).toBe('resolved');
    });

    it('returns resolved even if resolution failed', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', false);

      const status = getBoundaryStatus(events, 'boundary-1');
      expect(status).toBe('resolved');
    });
  });

  describe('getResolvedBoundaries', () => {
    it('returns empty set initially', () => {
      const resolved = getResolvedBoundaries(events);
      expect(resolved.size).toBe(0);
    });

    it('returns set of resolved boundaries', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      subscribeToBoundary(events, 'boundary-2', () => {});
      subscribeToBoundary(events, 'boundary-3', () => {});

      emitBoundaryResolution(events, 'boundary-1', true);
      emitBoundaryResolution(events, 'boundary-3', true);

      const resolved = getResolvedBoundaries(events);
      expect(resolved.has('boundary-1')).toBe(true);
      expect(resolved.has('boundary-2')).toBe(false);
      expect(resolved.has('boundary-3')).toBe(true);
    });

    it('returns copy not reference', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', true);

      const resolved1 = getResolvedBoundaries(events);
      const resolved2 = getResolvedBoundaries(events);

      expect(resolved1).not.toBe(resolved2); // Different objects
      expect(resolved1.size).toBe(resolved2.size); // But equal content
    });
  });

  describe('resetBoundaryEventState', () => {
    it('clears all listeners', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      subscribeToBoundary(events, 'boundary-2', () => {});

      resetBoundaryEventState(events);

      expect(events.listeners.size).toBe(0);
    });

    it('clears all resolved boundaries', () => {
      subscribeToBoundary(events, 'boundary-1', () => {});
      emitBoundaryResolution(events, 'boundary-1', true);

      resetBoundaryEventState(events);

      expect(events.resolved.size).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('handles multiple concurrent boundaries', () => {
      const results = new Map<string, boolean>();

      subscribeToBoundary(events, 'boundary-1', event => {
        results.set(event.boundaryId, event.resolved);
      });
      subscribeToBoundary(events, 'boundary-2', event => {
        results.set(event.boundaryId, event.resolved);
      });
      subscribeToBoundary(events, 'boundary-3', event => {
        results.set(event.boundaryId, event.resolved);
      });

      emitBoundaryResolution(events, 'boundary-1', true);
      emitBoundaryResolution(events, 'boundary-2', false);
      emitBoundaryResolution(events, 'boundary-3', true);

      expect(results.get('boundary-1')).toBe(true);
      expect(results.get('boundary-2')).toBe(false);
      expect(results.get('boundary-3')).toBe(true);
    });

    it('supports listener cleanup during iteration', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const unsubscribe1 = subscribeToBoundary(events, 'boundary-1', listener1);
      subscribeToBoundary(events, 'boundary-1', listener2);

      // Unsubscribe first listener
      unsubscribe1();

      // Emit should only call listener2
      emitBoundaryResolution(events, 'boundary-1', true);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('supports conditional resolution based on events', () => {
      const resolvedFirst = new Set<string>();

      subscribeToBoundary(events, 'boundary-1', event => {
        if (event.resolved) {
          resolvedFirst.add('boundary-1');
        }
      });
      subscribeToBoundary(events, 'boundary-2', event => {
        if (event.resolved && resolvedFirst.has('boundary-1')) {
          resolvedFirst.add('boundary-2');
        }
      });

      emitBoundaryResolution(events, 'boundary-2', true); // Out of order
      emitBoundaryResolution(events, 'boundary-1', true);

      expect(resolvedFirst.has('boundary-1')).toBe(true);
      expect(resolvedFirst.has('boundary-2')).toBe(false); // Wasn't resolved yet when boundary-2 emitted
    });

    it('tracks multiple independent event states', () => {
      const events1 = createBoundaryEventState();
      const events2 = createBoundaryEventState();

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      subscribeToBoundary(events1, 'boundary-1', listener1);
      subscribeToBoundary(events2, 'boundary-1', listener2);

      emitBoundaryResolution(events1, 'boundary-1', true);

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).not.toHaveBeenCalled();

      emitBoundaryResolution(events2, 'boundary-1', true);

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });
  });
});
