/**
 * Config schema, declared via the `config` field of `core.register()` in
 * main.ts. Every leaf gets a widget in the shared config UI (server, per-
 * dimension and per-player scopes), values persist across restarts, and
 * `register()` returns fully-typed accessors over this shape.
 *
 * Export the type so other addons can read your config with full typing via
 * `core.config.of<ExampleConfigDef>(...)`.
 */
export const configDef = {
  server: {
    general: {
      greetingEnabled: { type: 'boolean' as const, default: true, label: 'Greeting Enabled' },
      greetingColor: { type: 'enum' as const, default: 'yellow' as const, options: ['yellow', 'green', 'aqua'] as const, label: 'Greeting Color' },
    },
  },
  player: {
    showTips: { type: 'boolean' as const, default: true, label: 'Show Tips' },
  },
} as const;

export type ExampleConfigDef = typeof configDef;
