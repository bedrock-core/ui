import type { Runtime } from '@bedrock-core/server-runtime';
import { defineRegistry, type RegistryAccessor, type RegistryDefinition } from '@bedrock-core/server-runtime/library';
import { isScreenMetadata, screenMetadata, type ScreenMetadata } from '@bedrock-core/ui-runtime';
import { screenReferences, isScreenReference, type ScreenReference } from '../runtime/reference';
import type { ScreenAnnouncement } from './api';

/** A screen together with the realm that published it. Ownership is not parsed from its key. */
export interface OwnedScreen extends ScreenMetadata {
  readonly owner: string;
}

function isAnnouncement(value: unknown): value is ScreenAnnouncement {
  return typeof value === 'object' && value !== null && 'v' in value && value.v === 1
    && 'screens' in value && Array.isArray(value.screens) && value.screens.every(isScreenMetadata)
    && 'references' in value && typeof value.references === 'object' && value.references !== null
    && !Array.isArray(value.references) && Object.values(value.references).every(isScreenReference);
}

const SCREENS: RegistryDefinition<ScreenAnnouncement> = { id: 'core:screens', contract: 1, accepts: isAnnouncement };

function copyMetadata(screen: ScreenMetadata): ScreenMetadata {
  const copy: unknown = JSON.parse(JSON.stringify(screen));

  if (!isScreenMetadata(copy)) { throw new Error('Invalid screen metadata.'); }

  return copy;
}

/** Owner-written screen metadata and static references, acquired through the library's registry interest. */
export class ScreensRegistry {
  private readonly _core: Runtime;
  private readonly _registry: RegistryAccessor<ScreenAnnouncement>;
  private readonly _registered = new Map<string, ScreenMetadata>();

  constructor(core: Runtime) {
    this._core = core;
    this._registry = core.install(defineRegistry(SCREENS, { revision: 1 }));
  }

  /** Every registered screen, or only the screens published by one realm. */
  all(owner?: string): readonly OwnedScreen[] {
    const owners = owner === undefined ? new Set([this._core.id, ...this._core.registry.all().map(addon => addon.id)]) : new Set([owner]);

    return [...owners].flatMap((id) => {
      const feed = this.read(id);

      return feed?.screens.map(screen => ({ ...copyMetadata(screen), owner: id })) ?? [];
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
    this._registry.set(this._core.id, this.local());
  }

  /** Clear local entries and withdraw the registry when their owning runtime stops. */
  clear(): void {
    this._registered.clear();
    this._registry.stop();
  }

  /** Registers a local host entry point; the navigation service owns its opener. */
  add(screen: ScreenMetadata): void {
    if (!isScreenMetadata(screen)) { throw new Error('Invalid screen metadata.'); }

    this._registered.set(screen.key, copyMetadata(screen));
    this.publish();
  }

  /** Removes an entry point registered by the navigation service. */
  remove(key: string): void {
    this._registered.delete(key);
    this.publish();
  }

  private local(): ScreenAnnouncement {
    const screens = new Map(screenMetadata().map(screen => [screen.key, screen]));

    for (const [key, screen] of this._registered) { screens.set(key, screen); }

    return { v: 1, screens: [...screens.values()], references: screenReferences() };
  }

  private read(owner: string): ScreenAnnouncement | undefined {
    if (owner === this._core.id) { return this.local(); }

    return this._registry.of(owner)?.[owner];
  }
}
