import type { Installation, InstallationLifetime } from '@bedrock-core/server-runtime';
import type { RegistryDefinition } from '@bedrock-core/server-runtime/library';

interface FixtureRuntime {
  id: string;
  registryFixture: {
    write(registry: string, entries: Record<string, unknown> | undefined): void;
    read(owner: string, registry: string): Record<string, unknown> | undefined;
  };
}

interface FixtureRegistry {
  get(id: string): unknown;
  of(owner: string): Record<string, unknown> | undefined;
  set(id: string, value: unknown): void;
  stop(): void;
}

interface FixtureDeclaration {
  install(core: FixtureRuntime, lifetime: InstallationLifetime): Installation<FixtureRegistry>;
}

/** Domain tests stub dataset delivery; transport acceptance runs against the real Runtime. */
export function registryDeclarations(): {
  defineRegistry(definition: RegistryDefinition<unknown>, options?: { entries?: Record<string, unknown> }): FixtureDeclaration;
} {
  return {
    defineRegistry(definition: RegistryDefinition<unknown>, options: { entries?: Record<string, unknown> } = {}): FixtureDeclaration {
      return {
        install(core: FixtureRuntime, lifetime: InstallationLifetime): Installation<FixtureRegistry> {
          let entries = { ...options.entries };
          let stopped = false;

          const publish = (): void => { core.registryFixture.write(definition.id, entries); };

          const result = {
            get: (id: string): unknown => Object.hasOwn(entries, id) ? entries[id] : undefined,
            of(owner: string): Record<string, unknown> | undefined {
              if (stopped) { return undefined; }

              const found = core.registryFixture.read(owner, definition.id);

              return found !== undefined && Object.values(found).every(definition.accepts) ? found : undefined;
            },
            set(id: string, value: unknown): void {
              if (stopped) { throw new Error('registry is stopped'); }

              if (!definition.accepts(value)) { throw new TypeError('invalid registry record'); }

              entries = { ...entries, [id]: value };
              publish();
            },
            stop(): void {
              if (stopped) { return; }

              stopped = true;
              entries = {};
              core.registryFixture.write(definition.id, undefined);
            },
          };

          lifetime.defer(() => result.stop());
          publish();

          return { value: result };
        },
      };
    },
  };
}
