/**
 * Config schema, declared via the `config` field of `core.register()` in
 * main.ts. Every leaf gets a widget in the shared config UI (server, per-
 * dimension and per-player scopes), values persist across restarts, and
 * `register()` returns fully-typed accessors over this shape.
 *
 * Groups nest as deeply as you like. Name one with `$label` / `$description`
 * and the UI titles it accordingly; leave them off and it derives a title from
 * the key. A level holding only sub-groups is rendered as a list of buttons,
 * and the level holding the settings is the form — so structure here is what
 * decides how the screen reads.
 *
 * Export the type so other addons can read your config with full typing via
 * `core.config.of<ExampleConfigDef>(...)`.
 */
export const configDef = {
  server: {
    general: {
      $label: 'General',
      $description: 'Basic behavior for everyone on the world.',
      greetingEnabled: { type: 'boolean' as const, default: true, label: 'Greeting Enabled' },
      greetingColor: { type: 'enum' as const, default: 'yellow' as const, options: ['yellow', 'green', 'aqua'] as const, label: 'Greeting Color' },
    },
  },
  player: {
    showTips: { type: 'boolean' as const, default: true, label: 'Show Tips' },
    // Any number of a fixed set — one checkbox per option. Use a `list` instead when the
    // values are open-ended; that one is edited on a page of its own.
    notify: {
      type: 'multiselect' as const,
      options: ['join', 'death', 'advancement'] as const,
      default: ['join'] as const,
      label: 'Notifications',
    },
  },
} as const;

export type ExampleConfigDef = typeof configDef;
