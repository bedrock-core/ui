import type { JSX } from '../../../jsx';
import { isContextProvider } from '../../fabric';
import { setCurrentFiber } from '../../fabric/registry';
import type { Context, Dispatcher } from '../../fabric/types';
import { isElement } from '../../guards';

/**
 * Build-time expansion: the same job {@link expandAndResolveContexts} does at
 * runtime, minus everything that needs a player.
 *
 * A compiled screen is rendered once, on a build machine, with no player, no
 * fibers and no lifecycle. Its layout is then frozen into JSON UI and serves
 * every player who opens it. So components, props, composition and context all
 * work exactly as they do today — and anything that implies per-player or
 * over-time state cannot, because there is nothing for it to belong to.
 *
 * Rather than let those fail with `[fiber] useState called outside an active
 * fiber`, this phase installs a dispatcher that explains what to reach for
 * instead. Getting that wrong is the single most likely first mistake when
 * writing a compiled screen, so the error is the documentation.
 */

/** Thrown when a compiled screen calls a hook that only exists at runtime. */
export class CompileTimeHookError extends Error {
  public constructor(hook: string, why: string, instead: string) {
    super(
      `${hook}() cannot be used in a compiled screen.\n`
      + `  ${why}\n`
      + `  Instead: ${instead}`,
    );

    this.name = 'CompileTimeHookError';
  }
}

const FROZEN_LAYOUT = 'A compiled screen is laid out once at build time and cannot change shape at runtime.';
const NO_LIFECYCLE = 'There is no render loop at build time — nothing mounts, updates or unmounts.';
const NO_PLAYER = 'One compiled layout serves every player, so there is no player to read.';

/** Context values in scope for the component currently being expanded. */
let contexts = new Map<unknown, unknown>();

const CompileDispatcher: Dispatcher = {
  useState<T>(): [T, (v: T | ((prev: T) => T)) => void] {
    throw new CompileTimeHookError(
      'useState',
      FROZEN_LAYOUT,
      'keep the state in your script and declare a channel the screen reads.',
    );
  },

  useReducer<S, A>(): [S, (action: A) => void] {
    throw new CompileTimeHookError(
      'useReducer',
      FROZEN_LAYOUT,
      'keep the reducer in your script and declare a channel the screen reads.',
    );
  },

  useEffect(): void {
    throw new CompileTimeHookError(
      'useEffect',
      NO_LIFECYCLE,
      'run the effect in the container session, which owns open/close and every tick between.',
    );
  },

  useRef<T>(): { current: T } {
    throw new CompileTimeHookError(
      'useRef',
      NO_LIFECYCLE,
      'nothing persists between build and runtime; hold the value in your script.',
    );
  },

  useEvent(): void {
    throw new CompileTimeHookError(
      'useEvent',
      NO_LIFECYCLE,
      'subscribe in the container session instead.',
    );
  },

  usePlayer(): never {
    throw new CompileTimeHookError(
      'usePlayer',
      NO_PLAYER,
      'put the per-player difference on a channel, or compile a variant per case and gate it.',
    );
  },

  useExit(): () => void {
    throw new CompileTimeHookError(
      'useExit',
      NO_PLAYER,
      'close the container from the script side.',
    );
  },

  /** The one hook that survives: providers are resolved while the tree expands. */
  useContext<T>(ctx: Context<T>): T {
    // The stack is heterogeneous by nature — one map holds every provider in
    // scope — so the value comes back untyped and the context's own parameter is
    // what re-types it. Same trade the runtime dispatcher makes.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return contexts.has(ctx) ? contexts.get(ctx) as T : ctx.defaultValue;
  },
};

const asChildren = (children: JSX.Node): JSX.Node[] => {
  if (Array.isArray(children)) {
    return children;
  }

  return isElement(children) ? [children] : [];
};

const expandChildren = (children: JSX.Node): JSX.Element[] =>
  asChildren(children)
    .filter(isElement)
    .map(child => expandNode(child));

function expandNode(element: JSX.Element): JSX.Element {
  // A function component: call it, then expand whatever it returned.
  if (typeof element.type === 'function') {
    const rendered = element.type(element.props) as JSX.Node;

    if (!isElement(rendered)) {
      return { type: 'fragment', props: { children: [] } };
    }

    return expandNode(rendered);
  }

  // A provider: its value is in scope for the subtree, and then it disappears.
  if (isContextProvider(element)) {
    const { __context: ctx, value, children } = element.props;
    const outer = contexts;

    contexts = new Map(outer);
    contexts.set(ctx, value);

    try {
      return { type: 'fragment', props: { children: expandChildren(children) } };
    } finally {
      contexts = outer;
    }
  }

  return {
    type: element.type,
    nativeArgs: element.nativeArgs,
    props: { ...element.props, children: expandChildren(element.props.children) },
  };
}

/**
 * Expands a tree with no player attached, resolving contexts and rejecting any
 * hook that cannot mean anything at build time.
 *
 * @param element - Root element of the screen being compiled.
 * @param initial - Context values to seed, for providers supplied by the build
 *   rather than by the tree itself (theme, i18n, pack config).
 * @returns The tree with every function component expanded.
 * @throws {@link CompileTimeHookError} when a runtime-only hook is called.
 */
export function expandStatic(
  element: JSX.Element,
  initial?: ReadonlyMap<unknown, unknown>,
): JSX.Element {
  contexts = new Map(initial ?? []);

  setCurrentFiber(undefined, CompileDispatcher);

  try {
    return expandNode(element);
  } finally {
    setCurrentFiber(undefined, undefined);
    contexts = new Map();
  }
}
