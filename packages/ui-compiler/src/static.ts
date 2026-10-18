import type { DisplayText, JSX } from '@bedrock-core/ui-runtime';
import {
  actionMetadataOf, declaredStatic, entryValue, isExitButton, rootOf, whyNotPlainData, type EntryEntry,
} from '@bedrock-core/ui-runtime/compile';

/**
 * A screen that needs nothing at runtime.
 *
 * A screen is STATIC when every value is baked and every press carries plain
 * action metadata. The build then knows what showing it requires without
 * retaining its component or handlers.
 *
 * Such a screen needs no component in the shipped addon: it ships as a table,
 * so opening it is one form call instead of rebuilding a tree whose layout is
 * already baked into the pack.
 *
 * Live carriers, unannotated handlers and metadata that cannot be serialized
 * keep the component in the shipped addon. Libraries own the meaning of their
 * metadata; the compiler only validates and preserves it.
 */
export interface StaticScreen {
  /** The value each entry is shown with, in `selection` order. */
  readonly values: readonly DisplayText[];
  /** Plain action metadata in `selection` order; native exits use null. */
  readonly actions: readonly unknown[];
}

/** Why a screen is not static, in the words its author would need to hear. */
export interface NotStatic {
  readonly reason: string;
}

/**
 * Reads a compiled screen's entries as a static table, or says what stops it.
 *
 * Metadata factories receive the namespace so their owning library can resolve
 * identifiers before the table is serialized.
 */
export function staticTable(entries: readonly EntryEntry[], ns: string): StaticScreen | NotStatic {
  const actions: unknown[] = [];

  for (const entry of entries) {
    if (entry.carrier !== undefined) {
      return { reason: `an entry carries a live ${entry.carrier === 'text' ? 'string' : entry.carrier}` };
    }

    const action = actionMetadataOf(entry.element, { namespace: ns });

    if (action === undefined) {
      // The way out is the exception: the client closes the screen, so the
      // press reaches no script and needs nothing described.
      if (isExitButton(entry.element)) {
        actions.push(null);
        continue;
      }

      return { reason: 'a press runs a handler, which only the addon that wrote it can run' };
    }

    const why = whyNotPlainData(action, 'action');

    if (why !== undefined) {
      return { reason: `an action is not plain data: ${why}` };
    }

    actions.push(action);
  }

  return { values: entries.map(entryValue), actions };
}

/** Whether the screen's author declared it static, read off the root the build walked. */
export function wantsStatic(tree: JSX.Element): boolean {
  const root = rootOf(tree);

  return root !== undefined && declaredStatic(root);
}
