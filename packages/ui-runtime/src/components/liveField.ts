import type { UiEvent } from '../core/events';
import { useState } from '../hooks/useState';
import type { JSX } from '../jsx';

/** A live control change, scoped to the player owning the screen. */
export type FieldChange<T> = (value: T, event: UiEvent) => void | Promise<void>;

/** Adds live value ownership without changing a modal field's serialized payload. */
export function useLiveField<T extends string | number>(element: JSX.Element, initial: T, controlled: T | undefined, onChange?: FieldChange<T>): JSX.Element {
  const [internal, setInternal] = useState(initial);

  return { ...element, nativeArgs: { ...element.nativeArgs, value: controlled ?? internal,
    onChange: async (value: T, event: UiEvent): Promise<void> => {
      await onChange?.(value, event);
      setInternal(value);
    },
  } };
}
