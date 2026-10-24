import type { Control, ControlEntry, Document } from './jsonui';

type Found
  = | { readonly kind: 'control'; readonly list: ControlEntry[]; readonly index: number; readonly key: string }
    | { readonly kind: 'definition'; readonly key: string };

const nameOf = (key: string): string => {
  const at = key.indexOf('@');

  return at < 0 ? key : key.slice(0, at);
};

const isControl = (value: Document[string]): value is Control => typeof value !== 'string' && !('modifications' in value);
const same = (a: Found, b: Found): boolean => a.kind === 'definition'
  ? b.kind === 'definition' && a.key === b.key
  : b.kind === 'control' && a.list === b.list && a.index === b.index && a.key === b.key;

/** Tracks socket positions through host replacements; ambiguous or shared trees use ordered lookup. */
export class ControlIndex {
  private readonly locations = new Map<string, Found[]>();
  private readonly references = new WeakMap<Control, number>();
  private shared = false;
  private readonly document: Document;
  private readonly targets?: ReadonlySet<string>;
  private readonly aliases = new WeakSet<Control>();

  constructor(document: Document, targets?: ReadonlySet<string>) {
    this.document = document;
    this.targets = targets;

    for (const [key, control] of Object.entries(document)) {
      if (isControl(control)) { this.update({ [key]: control }, { kind: 'definition', key }, 1); } else if (typeof control !== 'string') { this.shared = true; }
    }
  }

  private markAlias(control: Control): void {
    if (this.aliases.has(control)) { return; }

    this.aliases.add(control);

    for (const entry of control.controls ?? []) {
      for (const child of Object.values(entry)) { this.markAlias(child); }
    }
  }

  private containsTarget(control: Control): boolean {
    return this.targets === undefined || (control.controls ?? []).some(entry =>
      Object.entries(entry).some(([key, child]) => this.targets!.has(nameOf(key)) || this.containsTarget(child)));
  }

  private update(entry: ControlEntry, found: Found, direction: 1 | -1): void {
    for (const [key, control] of Object.entries(entry)) {
      const location: Found = found.kind === 'definition' ? { kind: 'definition', key } : { ...found, key };
      const name = nameOf(key);
      const locations = this.locations.get(name) ?? [];

      if (direction === 1) {
        locations.push(location);
        this.locations.set(name, locations);
      } else {
        const at = locations.findIndex(candidate => same(candidate, location));

        if (at >= 0) { locations.splice(at, 1); }

        if (locations.length === 0) { this.locations.delete(name); }
      }

      const count = this.references.get(control) ?? 0;

      if (direction === 1 && count > 0) { this.markAlias(control); }

      if (direction === 1 && this.aliases.has(control) && this.containsTarget(control)) { this.shared = true; }

      this.references.set(control, count + direction);

      if (found.kind === 'definition' && !isControl(control)) { continue; }

      if (direction === 1 && count > 0) { continue; }

      for (const [index, child] of (control.controls ?? []).entries()) {
        this.update(child, { kind: 'control', list: control.controls!, index, key: '' }, direction);
      }
    }
  }

  private locate(name: string): Found {
    const cached = this.locations.get(name);

    if (!this.shared && cached?.length === 1) { return cached[0]; }

    for (const [key, control] of Object.entries(this.document)) {
      if (typeof control !== 'string' && nameOf(key) === name) { return { kind: 'definition', key }; }
    }

    const find = (list: ControlEntry[]): Found | undefined => {
      for (const [index, entry] of list.entries()) {
        for (const [key, control] of Object.entries(entry)) {
          if (nameOf(key) === name) { return { kind: 'control', list, index, key }; }

          const child = control.controls === undefined ? undefined : find(control.controls);

          if (child !== undefined) { return child; }
        }
      }

      return undefined;
    };

    for (const control of Object.values(this.document)) {
      if (!isControl(control) || control.controls === undefined) { continue; }

      const found = find(control.controls);

      if (found !== undefined) { return found; }
    }

    throw new Error('The face document has no control named "' + name + '" for a socket to fill.');
  }

  replace(name: string, transform: (entry: ControlEntry) => ControlEntry): void {
    const found = this.locate(name);
    let before: ControlEntry;

    if (found.kind === 'definition') {
      const control = this.document[found.key];

      if (control === undefined || !isControl(control)) { throw new Error('"' + found.key + '" is not a definition.'); }

      before = { [found.key]: control };
    } else {
      const control = found.list[found.index];

      if (control === undefined) { throw new Error('unreachable: a located entry is in its list'); }

      before = control;
    }

    if (!this.shared) { this.update(before, found, -1); }

    const after = transform(before);

    if (found.kind === 'definition') {
      for (const key of Object.keys(after)) {
        const previous = this.document[key];

        if (!this.shared && key !== found.key && previous !== undefined && isControl(previous)) {
          this.update({ [key]: previous }, { kind: 'definition', key }, -1);
        }
      }

      if (Object.keys(after)[0] !== found.key) { delete this.document[found.key]; }

      Object.assign(this.document, after);
    } else {
      found.list[found.index] = after;
    }

    if (!this.shared) { this.update(after, found, 1); }
  }
}
