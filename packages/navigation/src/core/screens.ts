import type { Runtime } from '@bedrock-core/server-runtime';
import { isScreenMetadata as isScreenDescriptor, screenMetadata as screenDescriptors, type ScreenMetadata as ScreenDescriptor } from '@bedrock-core/ui-runtime';
import { screenReferences, isScreenReference, type ScreenReference } from '../runtime/reference';

const FEED = 'core-navigation/screens';

/** A screen together with the realm that published it. Ownership is not parsed from its key. */
export interface OwnedScreen extends ScreenDescriptor {
  readonly owner: string;
}

interface ScreenAnnouncement {
  readonly v: 1;
  readonly screens: readonly ScreenDescriptor[];
  readonly references: Readonly<Record<string, ScreenReference>>;
}

function isAnnouncement(value: unknown): value is ScreenAnnouncement {
  return typeof value === 'object' && value !== null && 'v' in value && value.v === 1
    && 'screens' in value && Array.isArray(value.screens) && value.screens.every(isScreenDescriptor)
    && 'references' in value && typeof value.references === 'object' && value.references !== null
    && !Array.isArray(value.references) && Object.values(value.references).every(isScreenReference);
}

function copyDescriptor(screen: ScreenDescriptor): ScreenDescriptor {
  const copy: unknown = JSON.parse(JSON.stringify(screen));

  if (!isScreenDescriptor(copy)) { throw new Error('Invalid screen descriptor.'); }

  return copy;
}

/** Owner-written screen metadata and static references, read from Core's local mirror. */
export class ScreensRegistry {
  private readonly _core: Runtime;
  private readonly _registered = new Map<string, ScreenDescriptor>();

  constructor(core: Runtime) {
    this._core = core;
  }

  /** Every registered screen, or only the screens published by one realm. */
  all(owner?: string): readonly OwnedScreen[] {
    const owners = owner === undefined ? new Set([this._core.id, ...this._core.node.state.namespaces()]) : new Set([owner]);

    return [...owners].flatMap((id) => {
      const feed = this.read(id);

      return feed?.screens.map(screen => ({ ...copyDescriptor(screen), owner: id })) ?? [];
    });
  }

  /** Exact-key lookup. Ambiguous keys are rejected rather than choosing an owner. */
  get(key: string): OwnedScreen | undefined {
    const matches = this.all().filter(screen => screen.key === key);

    return matches.length === 1 ? matches[0] : undefined;
  }

  /** Finds a named screen in one realm, including a realm with a different UI namespace. */
  find(owner: string, name: string): OwnedScreen | undefined {
    const matches = this.all(owner).filter(screen => screen.key.slice(screen.key.lastIndexOf(':') + 1) === name);

    return matches.length === 1 ? matches[0] : undefined;
  }

  /** A reference drawable without invoking the owning realm. */
  reference(key: string): ScreenReference | undefined {
    const owner = this.get(key)?.owner;

    const reference = owner === undefined ? undefined : this.read(owner)?.references[key];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- validated reference metadata retains its shape through JSON
    return reference === undefined ? undefined : JSON.parse(JSON.stringify(reference)) as ScreenReference;
  }

  /** Publishes the current build's metadata and registered host entry points. */
  publish(): void {
    this._core.node.state.set(this._core.id, FEED, this.local());
  }

  /** Registers a local host entry point; the navigation service owns its opener. */
  add(screen: ScreenDescriptor): void {
    if (!isScreenDescriptor(screen)) { throw new Error('Invalid screen descriptor.'); }

    this._registered.set(screen.key, copyDescriptor(screen));
    this.publish();
  }

  /** Removes an entry point registered by the navigation service. */
  remove(key: string): void {
    this._registered.delete(key);
    this.publish();
  }

  private local(): ScreenAnnouncement {
    const screens = new Map(screenDescriptors().map(screen => [screen.key, screen]));

    for (const [key, screen] of this._registered) { screens.set(key, screen); }

    return { v: 1, screens: [...screens.values()], references: screenReferences() };
  }

  private read(owner: string): ScreenAnnouncement | undefined {
    if (owner === this._core.id) { return this.local(); }

    const value = this._core.node.state.get(owner, FEED);

    return isAnnouncement(value) ? value : undefined;
  }
}
