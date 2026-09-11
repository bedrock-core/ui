/**
 * A value as a screen may read it: deeply readonly.
 *
 * State reaches a component through {@link useState} and {@link useReducer},
 * and a render only happens because a setter ran. A value written in place —
 * `state.count++`, `items.push(x)` — changes what the next render would draw
 * and tells nobody, so the screen keeps drawing the old one; on a compiled
 * screen it is worse, because the build measured the value it was given. This
 * type makes that a compile error instead: to change state, produce a new
 * value and hand it to the setter.
 *
 * Functions pass through untouched, arrays become `readonly`, and every other
 * object is mapped property by property. A `readonly` modifier does not affect
 * assignability, so an object still goes wherever it went before; a readonly
 * ARRAY does, which is the one place a caller may have to copy.
 */
export type Immutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer E)[]
    ? readonly Immutable<E>[]
    : T extends object
      ? { readonly [K in keyof T]: Immutable<T[K]> }
      : T;

/** What a state setter takes: a new value, or a function of the current one. */
export type StateUpdate<T> = T | ((prev: Immutable<T>) => T);

/** What {@link useState} returns. */
export type StateSlot<T> = readonly [Immutable<T>, (value: StateUpdate<T>) => void];

/** What {@link useReducer} returns. */
export type ReducerSlot<S, A> = readonly [Immutable<S>, (action: A) => void];
