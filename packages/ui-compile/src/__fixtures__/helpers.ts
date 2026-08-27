import type { Control, Document, Modified } from '../jsonui';

/** Whether a document entry edits a definition another file owns rather than declaring one. */
export const isModified = (value: Control | Modified | string): value is Modified =>
  typeof value !== 'string' && 'modifications' in value;

/** Every definition in the document, by name. Modifications are not definitions. */
export const defs = (doc: Document): Record<string, Control> => {
  const out: Record<string, Control> = {};

  for (const [name, value] of Object.entries(doc)) {
    if (typeof value !== 'string' && !isModified(value)) {
      out[name] = value;
    }
  }

  return out;
};

/** A modification by the name of the definition it edits, or a failure naming it. */
export const modification = (doc: Document, name: string): Modified => {
  const found = doc[name];

  if (found === undefined || !isModified(found)) {
    throw new Error(`no modification of ${name}`);
  }

  return found;
};

/** Walks every control under one, inline children included. */
export const walk = (control: Control, visit: (name: string, control: Control) => void): void => {
  for (const entry of control.controls ?? []) {
    for (const [name, child] of Object.entries(entry)) {
      visit(name, child);
      walk(child, visit);
    }
  }
};

/** Walks every control in the document, definitions and inline children alike. */
export const eachControl = (doc: Document, visit: (name: string, control: Control) => void): void => {
  for (const [name, control] of Object.entries(defs(doc))) {
    visit(name, control);
    walk(control, visit);
  }
};

/** A definition by name, or a failure naming it. */
export const definition = (doc: Document, name: string): Control => {
  const found = doc[name];

  if (found === undefined || typeof found === 'string' || isModified(found)) {
    throw new Error(`no definition ${name}`);
  }

  return found;
};

/** A direct child of a control by its entry name, or a failure naming it. */
export const child = (parent: Control, name: string): Control => {
  const found = parent.controls?.find(entry => name in entry)?.[name];

  if (found === undefined) {
    throw new Error(`no child ${name}`);
  }

  return found;
};

/** The first control anywhere in the document whose entry name matches. */
export const find = (doc: Document, matches: (name: string) => boolean): [string, Control] => {
  let found: [string, Control] | undefined;

  eachControl(doc, (name, control) => {
    found ??= matches(name) ? [name, control] : undefined;
  });

  if (found === undefined) {
    throw new Error('no control matched');
  }

  return found;
};

/** Every control anywhere in the document whose entry name matches, in document order. */
export const findAll = (doc: Document, matches: (name: string) => boolean): [string, Control][] => {
  const found: [string, Control][] = [];

  eachControl(doc, (name, control) => {
    if (matches(name)) {
      found.push([name, control]);
    }
  });

  return found;
};

/** Every child entry of a control as `[name, control]` pairs, in order. */
export const entries = (control: Control): [string, Control][] =>
  (control.controls ?? []).flatMap(entry => Object.entries(entry));
