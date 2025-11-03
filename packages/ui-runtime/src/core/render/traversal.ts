import type { Player } from '@minecraft/server';
import type { FunctionComponent } from '../../jsx';

/**
 * Encapsulates parent state for inheritance calculations.
 * Propagated down the tree during Phase 4 (inheritance) to compute
 * final visible/enabled values and relative positioning.
 */
export interface ParentState {
  visible: boolean; // Parent's resolved visibility (default: true)
  enabled: boolean; // Parent's resolved enabled state (default: true)
  x: number; // Parent's X coordinate (default: 0)
  y: number; // Parent's Y coordinate (default: 0)
  position: 'absolute' | 'relative'; // Parent's position mode (default: 'relative')
}

/**
 * Context passed through tree traversal during rendering phase.
 *
 * This is part of the TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering): Build complete tree, create all instances, initialize hooks
 * Phase 2 (Logic): Background effects run while form is displayed
 */
export interface TraversalContext {
  parentPath: string[]; // Component path from root: ['Example', 'Counter']
  currentSuspenseBoundary?: string; // Track which Suspense boundary we're currently in
  idCounters: Map<string, number>; // Per-parent-path counters for auto-keys
  parentState?: ParentState; // Parent state for inheritance (used in Phase 4)
  currentContext: Map<symbol, unknown>; // Fiber context snapshot being propagated
}

/**
 * Generate unique hierarchical ID for component instance.
 *
 * IDs follow the format: "playerName:path/to/Component" or "playerName:path/to/Component:key"
 * This ensures each component node in the tree has a unique, stable instance.
 *
 * @param player - Player rendering the component
 * @param component - Component function
 * @param key - Optional key prop from JSX (for list items)
 * @param parentPath - Path from root to parent component
 * @returns Unique component ID
 *
 * @example
 * generateComponentId(player, Example, undefined, [])
 *   → "Steve:Example"
 *
 * generateComponentId(player, Counter, undefined, ['Example'])
 *   → "Steve:Example/Counter"
 *
 * generateComponentId(player, TodoItem, 'todo-1', ['Example', 'TodoList'])
 *   → "Steve:Example/TodoList/TodoItem:todo-1"
 */
export function generateComponentId(
  player: Player,
  component: FunctionComponent,
  key: string | undefined,
  parentPath: string[],
): string {
  const componentName = component.name || 'anonymous';
  const pathSegment = key ? `${componentName}:${key}` : componentName;
  const fullPath = [...parentPath, pathSegment].join('/');

  return `${player.id}:${fullPath}`;
}

/**
 * Create initial traversal context for tree building.
 * Used as the entry point for Phase 1.
 */
export function createInitialContext(): TraversalContext {
  return {
    parentPath: [],
    currentSuspenseBoundary: undefined,
    idCounters: new Map(),
    currentContext: new Map<symbol, unknown>(),
  };
}

/**
 * Create root context with initial parent state.
 * Used as the entry point for Phase 4 (inheritance).
 */
export function createRootContext(initialContext: TraversalContext): TraversalContext & { parentState: ParentState } {
  return {
    ...initialContext,
    parentState: {
      visible: true,
      enabled: true,
      x: 0,
      y: 0,
      position: 'relative',
    },
  };
}
