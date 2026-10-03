import type { Document } from '../jsonui';
import chestCell from './templates/chest_cell';
import chestChrome from './templates/chest_chrome';
import chestRouter from './templates/chest_router';
import chestText from './templates/chest_text';
import control from './templates/control';
import cursor from './templates/cursor';
import dropdown from './templates/dropdown';
import shared from './templates/form_shared';
import select from './templates/inline_select';
import input from './templates/input';
import scroll from './templates/scroll';
import slider from './templates/slider';
import state from './templates/state';
import text from './templates/text';
import toggle from './templates/toggle';
import type { TemplateModule } from './types';

const definitions: TemplateModule = {
  ...chestCell, ...chestChrome, ...chestRouter, ...chestText,
  ...control, ...cursor, ...dropdown, ...shared, ...select, ...input, ...scroll, ...slider, ...state, ...text, ...toggle,
};

/** Properties whose strings address definitions rather than visible text or textures. */
const referenceProperties = new Set(['control_name', 'control_ids', 'grid_item_template', 'anims']);
const supportReference = /^(core_ui_(?:chest|router|common|components|form_components|shapes))\.([A-Za-z0-9_]+)$/;

export interface UiSupport {
  file: string;
  document: Document;
}

/**
 * Links compiler-owned definitions into one addon's namespace. Dependencies are
 * followed transitively, including inherited controls, factories and variable
 * defaults. Instance names, bindings, payloads and authored text are preserved.
 */
export function createSupportLinker(addon: string): {
  link: <T extends object>(document: T) => T;
  path: (location: readonly string[]) => string[];
  support: () => UiSupport;
} {
  if (!/^[A-Za-z0-9_-]+$/.test(addon)) { throw new Error(`Invalid UI addon namespace: ${addon}`); }

  const namespace = `${addon}__ui_support`;
  const required = new Map<string, unknown>();
  const seen = new Set<string>();

  const reference = (value: string): string => {
    const prefix = value.startsWith('@') ? '@' : '';
    const source = value.slice(prefix.length);
    const match = supportReference.exec(source);

    if (match === null) { return value; }

    const definition = definitions[source];

    if (definition === undefined) { throw new Error(`Unknown compiler UI definition: ${source}`); }

    const name = `${match[1]}_${match[2]}`;

    if (!seen.has(name)) {
      // Reserve before descending so recursive definitions terminate.
      seen.add(name);
      const built = definition({ ref: reference });
      const key = built.base === undefined ? name : `${name}@${built.base}`;

      required.set(key, built.control);
    }

    return `${prefix}${namespace}.${name}`;
  };

  const entryKey = (key: string): string => {
    const at = key.indexOf('@');

    return at < 0 ? key : `${key.slice(0, at)}${reference(key.slice(at))}`;
  };

  const walk = (value: unknown, isReference = false): unknown => {
    if (typeof value === 'string') { return isReference ? reference(value) : value; }

    if (Array.isArray(value)) { return value.map(item => walk(item, isReference)); }

    if (value === null || typeof value !== 'object') { return value; }

    for (const [key, item] of Object.entries(value)) {
      const linkedKey = entryKey(key);

      if (key !== linkedKey) { Reflect.deleteProperty(value, key); }

      Reflect.set(value, linkedKey, walk(item, isReference || key.startsWith('$') || referenceProperties.has(key)));
    }

    return value;
  };

  return {
    link: <T extends object>(document: T): T => {
      const linked = structuredClone(document);

      walk(linked);

      return linked;
    },
    path: location => location.map(entryKey),
    support: () => ({
      file: `ui/core-ui/support/${addon}.json`,
      document: { namespace, ...Object.fromEntries([...required].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) },
    }),
  };
}
