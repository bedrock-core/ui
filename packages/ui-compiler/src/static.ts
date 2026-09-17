import type { DisplayText, JSX } from '@bedrock-core/ui-runtime';
import {
  declaredStatic, entryValue, isExitButton, linkTarget, rootOf, type EntryEntry,
} from '@bedrock-core/ui-runtime/compile';

/**
 * A screen that needs nothing at runtime.
 *
 * A screen is STATIC when every string it shows is baked and every press it
 * takes is a `<Link>`: nothing about it can change between one present and the
 * next, so the build already knows everything showing it requires — the title,
 * the value each entry carries, and where each press leads.
 *
 * Such a screen needs no component in the shipped addon: it ships as a table,
 * so opening it is one form call instead of rebuilding a tree whose layout is
 * already baked into the pack.
 *
 * The test is the entries, because an entry is exactly what a present carries.
 * An entry with a carrier holds a value that changes; an entry whose press is
 * not a link runs script the build cannot read. Either one and the screen keeps
 * its component.
 */
export interface StaticScreen {
  /** The value each entry is shown with, in `selection` order. */
  readonly values: readonly DisplayText[];
  /** Where each `selection` leads: another screen, back, or nowhere. */
  readonly targets: readonly ({ readonly to: string; readonly replace?: true } | { readonly back: true } | null)[];
}

/** Why a screen is not static, in the words its author would need to hear. */
export interface NotStatic {
  readonly reason: string;
}

/**
 * Reads a compiled screen's entries as a static table, or says what stops it.
 *
 * `ns` fills in the addon half of a bare key — a screen links to a sibling by
 * name, and anything reading this table has no bundle to resolve that against.
 */
export function staticTable(entries: readonly EntryEntry[], ns: string): StaticScreen | NotStatic {
  const targets: ({ to: string; replace?: true } | { back: true } | null)[] = [];

  for (const entry of entries) {
    if (entry.carrier !== undefined) {
      return { reason: `an entry carries a live ${entry.carrier === 'text' ? 'string' : entry.carrier}` };
    }

    const target = linkTarget(entry.element);

    if (target === undefined) {
      // The way out is the exception: the client closes the screen, so the
      // press reaches no script and needs nothing described.
      if (isExitButton(entry.element)) {
        targets.push(null);
        continue;
      }

      return { reason: 'a press runs a handler, which only the addon that wrote it can run' };
    }

    targets.push('back' in target
      ? target
      : { to: target.to.includes(':') ? target.to : `${ns}:${target.to}`, ...target.replace === true ? { replace: true as const } : {} });
  }

  return { values: entries.map(entryValue), targets };
}

/** Whether the screen's author declared it static, read off the root the build walked. */
export function wantsStatic(tree: JSX.Element): boolean {
  const root = rootOf(tree);

  return root !== undefined && declaredStatic(root);
}
