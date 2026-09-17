import { useEffect } from './useEffect';
import { useRef } from './useRef';
import { useState } from './useState';

/**
 * The read half of an observable: `get` for the current value, `subscribe` for the next ones.
 *
 * Structural on purpose. `@bedrock-core/observable`'s `ReadonlyObservable`, a config leaf, a db
 * document and a query all have this shape, and matching on shape rather than on an import keeps
 * this package free of a dependency on the server framework — which already depends on this one.
 */
export interface ObservableLike<T> {
  get(): T;
  subscribe(listener: (next: T, prev: T) => void): () => void;
}

/**
 * Reads an observable, and keeps the component's copy of it current.
 *
 * A change lands the way a state change does, because it IS one: the value goes into a state slot.
 * A form keeps it, and the player sees it on the next screen a press brings up — an open form
 * cannot change. A container screen updates its live values at once.
 *
 * With a `select` only a change to the selected slice counts, so a screen that shows a count is not
 * woken by every mutation of the collection behind it. Equality is `Object.is`, applied by the state
 * slot, so a slice that reads equal schedules nothing.
 *
 * ```tsx
 * const phase = useObservable(phaseObs);                // any change
 * const count = useObservable(playersObs, p => p.size); // only a change of size
 * ```
 *
 * `select` is read through a ref rather than a dependency, so passing an inline arrow — the usual
 * way to write one — does not resubscribe on every render. The subscription is keyed on the
 * observable alone.
 */
export function useObservable<T>(source: ObservableLike<T>): T;
export function useObservable<T, S>(source: ObservableLike<T>, select: (value: T) => S): S;

export function useObservable<T, S = T>(source: ObservableLike<T>, select?: (value: T) => S): S {
  const selectRef = useRef(select);

  selectRef.current = select;

  const read = (): S => {
    const value = source.get();

    if (selectRef.current !== undefined) {
      return selectRef.current(value);
    }

    // With no selector the overloads fix `S` to `T`. The implementation
    // signature cannot say so — `S = T` is a default, not a constraint — so
    // the narrowing the overloads guarantee is asserted here instead.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the no-select overload returns T, which is S
    return value as unknown as S;
  };

  const [slice, setSlice] = useState<S>(read);

  useEffect(() => {
    // The updater form is used throughout because a slice may itself be a function, which the
    // plain form would call instead of storing.
    const publish = (): void => {
      const next = read();

      setSlice(() => next);
    };

    // The value can move between this render and the subscription landing, so read once more
    // before listening; an unchanged value costs nothing.
    publish();

    return source.subscribe(publish);
  }, [source]);

  // The slot is readonly because STATE is readonly: a value written in place would
  // update nothing. This one is the source's, not the component's — it changes by
  // the source publishing a new value, and the observable owns what may touch it — so
  // it is handed back with the type the source declared.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the slot holds exactly what `read` returned
  return slice as S;
}
