/**
 * Every command this UI registers, all under the addon's own namespace:
 * `bt_gc_graves:config`, `:configat`, `:guide`, `:list`.
 *
 * ## Shape
 *
 * ```
 * :config                                    open the UI
 * :config get <setting>                      your own settings
 * :config set <setting> <value>
 * :config add|remove <setting> <item>        list settings only
 * :configat get <scope.setting> [target]     any scope
 * :configat set <scope.setting> <value> [target]
 * :configat add|remove <scope.setting> <item> [target]
 * ```
 *
 * The scope rides in the KEY (`server.pricing.tax_rate`) rather than as its own argument, and
 * that is what makes the whole thing work. A separate scope token would push the setting to
 * position 3 or 4 depending on whether the scope takes a target — and a parameter list is flat
 * and positional, with no branching, so a setting that moves cannot be an `Enum`. Prefixing
 * pins it, and pinning it is what keeps every setting autocompleting.
 *
 * Arity is dispatched on the verb, which is read before anything else is interpreted: for `get`
 * the third argument is the target, for every writing verb it is the value or item and the fourth
 * is the target.
 *
 * ## Every description starts with the namespace
 *
 * Bedrock gives the first pack to register a name an unqualified alias for it — the first
 * `x:guide` in the world also becomes plain `/guide`, and later packs are told to use their full
 * name. There is no way to opt out (`CustomCommand` has no alias field) and no way to detect it
 * (`CustomCommandOrigin` carries no command name), so `/guide` silently means one arbitrary
 * addon's guide and nothing in the callback can tell.
 *
 * What can be fixed is the player not knowing which. The command list shows the description, so
 * every one of these leads with the namespace: `/guide` reads as "bt_gc_economy - open this
 * addon's in-game guide", and the arbitrariness stops being a surprise.
 *
 * ## The same rule binds the addon's OWN commands
 *
 * An addon that mounts this UI has already spent its namespace here, and Minecraft gives a pack
 * exactly one. So every other command that addon registers has to be built from `core.id` too:
 *
 * ```ts
 * system.beforeEvents.startup.subscribe((ev) => {
 *   const ns = core.id;                                  // never a string literal
 *
 *   ev.customCommandRegistry.registerEnum(`${ns}:shopaction`, ['buy', 'sell']);
 *   ev.customCommandRegistry.registerCommand(
 *     { name: `${ns}:shop`, description: `${ns} - open the shop.`, ... },
 *     origin => ...,
 *   );
 * });
 * ```
 *
 * Reading it rather than hardcoding it is what makes a rename survivable — `creator`/`pack` in
 * `core.register()` are the only place the namespace is declared, and a literal keeps the old
 * prefix silently. Enums need it just as much as commands: an enum name is world-wide, so an
 * unprefixed `registerEnum('shopaction', ...)` collides with the next addon that thinks of the
 * same word, and the description-leads-with-the-namespace rule above applies verbatim.
 *
 * `ui(core, { commands: false })` opts out of the four registered here. It frees the names, not
 * the namespace — the addon is still `core.id` to state, config, RPC and the addon list, and its
 * own commands still belong under it.
 *
 * ## Permissions
 *
 * Two commands rather than one, because one command means one enum and one permission level.
 * `:config` is `Any` and its enum holds only the runner's own player-scope settings, so a normal
 * player cannot autocomplete — or reach — anything else. `:configat` is `Admin`, which keeps it
 * out of their command list entirely, and `withOperator` re-checks inside the callback (see
 * `origin.ts` for why that is not redundant).
 *
 * `cheatsRequired` is `false` throughout. Opening a config screen or reading your own settings
 * is not a cheat, and gating it on a world toggle would make the UI unreachable on exactly the
 * survival worlds it is most useful on. Authority comes from the permission level instead.
 */
import { CommandPermissionLevel, CustomCommandParamType, system } from '@minecraft/server';
import type {
  CustomCommandOrigin,
  CustomCommandRegistry,
  CustomCommandResult,
  Player,
} from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';
import { CONFIG_SCOPES, type EntrySchema, type FlatSchemaLike } from '../types';
import { buildNestedPatch } from '../config/nested';
import { translationsFor, type CoreT } from '../i18n';
import type { OpenCommand } from '../navigation/openTarget';
import { addToList, describeList, readList, removeFromList, setList } from './lists';
import { failure, success, withOperator, withPlayer } from './origin';
import { editableKeys, parseValue, splitScopedKey, type ScopedSchemas } from './parse';
import { describe, read, resolveTarget, write } from './targets';

/** Hands a fired command to whoever should answer it: `(player, what, args)`, uninterpreted. */
export type OpenCallback = (player: Player, command: OpenCommand, args: (string | undefined)[]) => void;

/**
 * What a config command can do. Registered as an enum so every verb autocompletes.
 *
 * `add` and `remove` exist for list settings, which no form can draw a control for: chat is where
 * a list is edited, and `set` alone would mean retyping the whole list to change one entry.
 */
const VERBS = ['get', 'set', 'add', 'remove'] as const;

/**
 * Register this addon's commands. Called by `ui(core)`.
 *
 * `onOpen` receives the request completely uninterpreted — who ran it, which kind, and the raw
 * arguments — because interpreting it is the elected host's job, not this realm's. The host
 * runs the newest installed code, so what an argument means stays patchable in the field.
 *
 * Enums are registered before the commands that reference them, and each group independently:
 * a registration cannot be undone, so a rejected enum has to leave its commands unregistered
 * rather than strand a command whose parameter names an enum that is not there.
 */
export function registerAddonCommands(core: Runtime, onOpen: OpenCallback): void {
  system.beforeEvents.startup.subscribe((ev) => {
    registerAll(ev.customCommandRegistry, core, core.id, onOpen);
  });
}

function registerAll(reg: CustomCommandRegistry, core: Runtime, ns: string, onOpen: OpenCallback): void {
  attempt(ns, `${ns}:guide`, () => {
    reg.registerCommand(
      {
        name: `${ns}:guide`,
        description: `${ns} - open this addon's in-game guide.`,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
      },
      origin => forward(origin, onOpen, 'guide', [ns]),
    );
  });

  attempt(ns, `${ns}:list`, () => {
    reg.registerCommand(
      {
        name: `${ns}:list`,
        description: `${ns} - open the addon list, with this addon selected.`,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
      },
      // The full list, with this addon selected — it is the one the player named by typing
      // this command, so it is the one worth showing first.
      origin => forward(origin, onOpen, 'list', [ns]),
    );
  });

  const local = core.config.local;
  const scoped: ScopedSchemas | undefined = local && {
    server: local.server.schema,
    dimension: local.dimension.schema,
    player: local.player.schema,
  };

  const ownKeys = scoped ? editableKeys(scoped.player) : [];
  const allKeys = scoped ? CONFIG_SCOPES.flatMap(s => editableKeys(scoped[s]).map(key => `${s}.${key}`)) : [];

  // Shared by both commands, so it is registered once and only when something will use it.
  const verbEnum = `${ns}:verb`;
  const verbs = (ownKeys.length > 0 || allKeys.length > 0)
    && attempt(ns, verbEnum, () => { reg.registerEnum(verbEnum, [...VERBS]); });

  registerConfig(reg, core, ns, verbs ? verbEnum : undefined, scoped?.player, ownKeys, onOpen);

  if (verbs && allKeys.length > 0 && scoped) {
    attempt(ns, `${ns}:configat`, () => { registerConfigAt(reg, core, ns, verbEnum, scoped, allKeys); });
  }
}

/**
 * `:config` — opens the UI bare, or reads and writes the runner's own player scope.
 *
 * Falls back to a no-parameter command when the addon has no player-scope settings, or when the
 * enums it would need did not register: opening the UI is the one thing this command must
 * always be able to do.
 */
function registerConfig(
  reg: CustomCommandRegistry,
  core: Runtime,
  ns: string,
  verbEnum: string | undefined,
  schema: FlatSchemaLike | undefined,
  ownKeys: string[],
  onOpen: OpenCallback,
): void {
  const keyEnum = `${ns}:setting`;
  const editable = verbEnum !== undefined
    && ownKeys.length > 0
    && schema !== undefined
    // Player-scope settings only, so a normal player cannot even autocomplete a server one.
    && attempt(ns, keyEnum, () => { reg.registerEnum(keyEnum, ownKeys); });

  attempt(ns, `${ns}:config`, () => {
    reg.registerCommand(
      {
        name: `${ns}:config`,
        description: editable
          ? `${ns} - open this addon's config, or: get <setting> | set <setting> <value> | add|remove <setting> <item>`
          : `${ns} - open this addon's config.`,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        optionalParameters: editable
          ? [
              { name: verbEnum, type: CustomCommandParamType.Enum },
              { name: keyEnum, type: CustomCommandParamType.Enum },
              { name: 'value', type: CustomCommandParamType.String },
            ]
          : [],
      },
      (origin: CustomCommandOrigin, verb?: string, key?: string, value?: string) => {
        // No verb at all is the plain "open it" form, whatever else the shape allows.
        if (verb === undefined) { return forward(origin, onOpen, 'config', [ns]); }

        return withPlayer(origin, player => runOwn(core, ns, schema ?? {}, player, verb, key, value));
      },
    );
  });
}

/** Read or write one of the runner's own settings. */
function runOwn(
  core: Runtime,
  ns: string,
  schema: FlatSchemaLike,
  player: Player,
  verb: string,
  key: string | undefined,
  value: string | undefined,
): CustomCommandResult {
  // The runner is the one being answered, so the reply is built in their language — the host
  // realm's published bundle carries this package's strings for every locale the world ships.
  const { t } = translationsFor(core.translations.forPlayer(player));

  if (key === undefined) {
    return failure(`Which setting? Usage: ${ns}:config ${verb} <setting>${argumentOf(verb)}`);
  }

  const target = { ok: true, scope: 'player', player } as const;
  const entry = schema[key];

  if (verb === 'get') { return success(`${key} = ${show(read(core, target), key, entry, t)}`); }

  if (value === undefined || (verb !== 'set' && value.trim() === '')) {
    return failure(missingArgument(`${ns}:config ${verb} ${key}${argumentOf(verb, entry)}`, verb, t));
  }

  const applied = applyWrite(entry, verb, key, value, () => read(core, target), t);

  if (!applied.ok) { return failure(applied.message); }

  // Validation is pure and can answer the player now; the write reaches dynamic properties and
  // cannot run inside the command callback's restricted-execution context.
  system.run(() => { write(core, target, applied.patch); });

  return success(`${key} = ${applied.rendered}`);
}

/**
 * `:configat` — any scope, any target. Operators and command blocks only.
 *
 * `CommandPermissionLevel.Admin` is what keeps this out of a normal player's autocomplete: the
 * engine filters the command list by tier, so they never see a command they would be refused.
 */
function registerConfigAt(
  reg: CustomCommandRegistry,
  core: Runtime,
  ns: string,
  verbEnum: string,
  scoped: ScopedSchemas,
  allKeys: string[],
): void {
  const keyEnum = `${ns}:scopedsetting`;

  // Scope-prefixed (`server.pricing.tax_rate`), which disambiguates a name two scopes share and
  // removes the need for a scope argument that would push the setting off a fixed position.
  reg.registerEnum(keyEnum, allKeys);

  reg.registerCommand(
    {
      name: `${ns}:configat`,
      description: `${ns} - any setting, any scope: get <scope.setting> [target] | set|add|remove <scope.setting> <value> [target]`,
      permissionLevel: CommandPermissionLevel.Admin,
      cheatsRequired: false,
      mandatoryParameters: [
        { name: verbEnum, type: CustomCommandParamType.Enum },
        { name: keyEnum, type: CustomCommandParamType.Enum },
      ],
      // What these mean depends on the verb: `get` takes only a target, while `set`, `add` and
      // `remove` take the value or the item first. A flat list cannot say that, so the callback
      // dispatches on the verb it read.
      optionalParameters: [
        { name: 'value', type: CustomCommandParamType.String },
        { name: 'target', type: CustomCommandParamType.String },
      ],
    },
    (origin, verb: string, key: string, a?: string, b?: string) => withOperator(origin, (runner) => {
      // A command block has no runner and therefore no language to answer in; this package's own
      // default locale stands in.
      const { t } = translationsFor(runner && core.translations.forPlayer(runner));
      const [scope, path] = splitScopedKey(key);
      const entry = scoped[scope][path];

      if (verb === 'get') {
        const target = resolveTarget(scope, a, runner);

        if (!target.ok) { return failure(target.message); }

        return success(`${key} = ${show(read(core, target), path, entry, t)}`);
      }

      if (a === undefined || (verb !== 'set' && a.trim() === '')) {
        return failure(missingArgument(`${ns}:configat ${verb} ${key}${argumentOf(verb, entry)} [target]`, verb, t));
      }

      // Resolved before the argument is interpreted, which `set` alone did not need to do: `add`
      // and `remove` are relative to what the target already holds, so there is nothing to check
      // the item against until the target is known.
      const target = resolveTarget(scope, b, runner);

      if (!target.ok) { return failure(target.message); }

      const applied = applyWrite(entry, verb, path, a, () => read(core, target), t);

      if (!applied.ok) { return failure(applied.message); }

      system.run(() => { write(core, target, applied.patch); });

      return success(`${key} = ${applied.rendered}`);
    }),
  );
}

/**
 * What a verb takes after the setting, for a usage line. `get` takes nothing but the target.
 *
 * A list `set` is quoted because it is comma-separated and therefore contains spaces, and Bedrock
 * would otherwise read only the first word as the argument.
 */
function argumentOf(verb: string, entry?: EntrySchema): string {
  if (verb === 'get') { return ''; }

  if (verb !== 'set') { return ' <item>'; }

  return entry?.type === 'list' ? ' "<items>"' : ' <value>';
}

/**
 * The "you left the argument out" refusal. `set` keeps the wording it has always had; the list
 * verbs take a single item rather than the whole value, and say so.
 */
function missingArgument(usage: string, verb: string, t: CoreT): string {
  return verb === 'set' ? `Which value? Usage: ${usage}` : t($ => $.command.list.whichItem, { usage });
}

/** One setting's current value for chat — a list as its items and count, anything else as before. */
function show(
  values: Record<string, unknown>,
  path: string,
  entry: EntrySchema | undefined,
  t: CoreT,
): string {
  return entry?.type === 'list' ? describeList(entry, readList(values, path), t) : describe(values, path);
}

/** What a writing verb decided: the patch to send and the line to answer with, or why it refused. */
type Applied
  = | { ok: true; patch: Record<string, unknown>; rendered: string }
    | { ok: false; message: string };

/**
 * The half of `set`, `add` and `remove` that both commands share: check the argument against the
 * schema entry, fold it into the value that will be stored, and render what the runner is told.
 *
 * Current values arrive as a thunk because only the list verbs need them. A scalar `set` replaces
 * the value outright, and making it read the scope first would spend a read on nothing.
 */
function applyWrite(
  entry: EntrySchema | undefined,
  verb: string,
  path: string,
  raw: string,
  current: () => Record<string, unknown>,
  t: CoreT,
): Applied {
  // Unreachable through the enum, which is built from the schema — but the schema can replicate
  // again between registration and the command being run, and registration cannot be redone.
  if (!entry) { return { ok: false, message: t($ => $.command.unknownSetting) }; }

  if (entry.type !== 'list') {
    // `add` and `remove` are list verbs: a scalar has nothing to append to or take out of.
    if (verb !== 'set') { return { ok: false, message: t($ => $.command.list.scalarOnly, { verb, key: path }) }; }

    const parsed = parseValue(entry, raw);

    return parsed.ok
      ? { ok: true, patch: buildNestedPatch({ [path]: parsed.value }), rendered: String(parsed.value) }
      : { ok: false, message: parsed.message };
  }

  // The enum offers exactly four verbs and `get` never reaches here, so `set` is what is left.
  const result = verb === 'add'
    ? addToList(entry, readList(current(), path), raw, t)
    : verb === 'remove'
      ? removeFromList(readList(current(), path), raw, t)
      : setList(entry, raw, t);

  if (!result.ok) { return result; }

  // A list lives in ONE flat key holding the array's JSON — the encoding the runtime's own
  // flattening produces — so it is patched exactly like a scalar.
  return {
    ok: true,
    patch: buildNestedPatch({ [path]: JSON.stringify(result.items) }),
    rendered: describeList(entry, result.items, t),
  };
}

/** Identify the acting player and hand the request on, one tick later. */
function forward(
  origin: CustomCommandOrigin,
  onOpen: OpenCallback,
  command: OpenCommand,
  args: (string | undefined)[],
): CustomCommandResult {
  return withPlayer(origin, (player) => {
    system.run(() => onOpen(player, command, args));

    return success();
  });
}

/**
 * Run one registration group, reporting rather than throwing. Returns whether it landed.
 *
 * Nothing here is contended — the namespace is this addon's alone — so a failure means the
 * engine rejected the shape. The overwhelmingly likely cause is a name outside `ns`, and
 * Bedrock's own error names only the namespace that won, never the one that should have been
 * used, so that is spelled out here. Saying which group was lost matters too: the others still
 * registered, and a silent gap reads as a bug in the UI.
 */
function attempt(ns: string, label: string, register: () => void): boolean {
  try {
    register();

    return true;
  } catch (error: unknown) {
    console.warn(
      `[config] '${label}' was not registered: ${String(error)}\n`
      + `  Every command and command enum this addon registers must sit under its own namespace, '${ns}'`
      + ' — Bedrock allows a pack exactly one. Read it from `core.id`.',
    );

    return false;
  }
}
