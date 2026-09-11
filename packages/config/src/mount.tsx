/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * Getting a fired command onto a screen.
 *
 * ## Why the realm that receives a command rarely renders it
 *
 * Each addon owns its own commands, in its own namespace (see `commands/addon.ts`), so nothing
 * is contended and nothing is frozen. But a world can easily hold an addon built a year ago and
 * one built today, and the old one's bundled copy of THIS package cannot be patched — its
 * author may never ship again.
 *
 * So receiving a command and answering it are split. The realm whose command was typed does the
 * smallest possible slice: identify the player, name the request, forward the raw arguments.
 * Every real decision — what the arguments mean, which screen opens, how anything renders —
 * happens on the elected host, which by construction runs the newest `@bedrock-core/server-runtime`
 * installed. Installing one up-to-date addon therefore fixes the shared UI for every addon in
 * the world, including the ones typed into an ancient realm.
 *
 * Everything below {@link dispatch} is host-side. Keep it that way when extending this: logic
 * added before the forward is logic that can never be fixed in the field.
 */
import { world } from '@minecraft/server';
import { addonReference, presentReference } from '@bedrock-core/ui-runtime';
import { provideReferences } from '@bedrock-core/navigation';
import type { Player } from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';
import { registerAddonCommands } from './commands/addon';
import { openTargetFrom, type OpenCommand, type OpenTarget } from './navigation/openTarget';
import { clampTarget } from './permissions';
import { getScopeValues } from './config/values';
import { guideKeyFor, screenReferenceFor } from './frameworkGuide';
import { canPresentAddonList, presentAddonList } from './compiled/host';
import {
  canPresentMenuList, canPresentScopePicker, isSectionLevel, openLevel,
  presentEntityRoster, presentListEditor, presentScopePicker, presentShapedEditor,
  trailOf, type SectionListOpeners, type SectionTarget,
} from './compiled/configHost';
import { i18n } from './i18n';
import { declaredParts } from './declared';
import { addonPageReference } from './compiled/page.screen';

/** What a receiving realm forwards: who typed it, what they asked for, and untouched arguments. */
interface OpenRequest {
  playerId: string;
  command: OpenCommand;
  args: (string | undefined)[];
}

/**
 * The RPC surface every realm that mounts this UI serves, since any of them may win the
 * election later. Namespaced like the runtime's own methods (`core:config.*`).
 */
interface HostUiRpc {
  'core:ui.open': (params: OpenRequest) => boolean;
}

/** Options for {@link ui}. */
export interface UiOptions {
  /**
   * Register this addon's `<namespace>:config` / `:configat` / `:guide` / `:list` commands
   * (see `commands/addon.ts`). On by default.
   *
   * Passing `false` leaves this addon with **no** commands at all, so the UI becomes reachable
   * only through another installed addon's commands or your own call to {@link openUi}.
   * That is a legitimate choice for an addon with no config that would rather not add names
   * to the command list.
   *
   * It frees those four names, not the namespace: whatever commands the addon does register
   * still belong under `core.id` (see `commands/addon.ts`).
   */
  commands?: boolean;
}

/**
 * Mount the shared config UI on a runtime. Call once, after `core.register()`.
 *
 * Registers this addon's commands and serves the open RPC, so this realm can render on behalf
 * of another whenever it wins the host election.
 */
export function ui(core: Runtime, options: UiOptions = {}): void {
  core.rpc.serve<HostUiRpc>({
    'core:ui.open': ({ playerId, command, args }) => {
      const player = world.getPlayers().find(candidate => candidate.id === playerId);

      // Disconnected between typing the command and this request. Nothing the caller can do
      // about it, so reject rather than drop it silently.
      if (!player) { throw new Error(`core:ui.open: player '${playerId}' is not in the world`); }

      void openUi(core, player, openTargetFrom(command, args));

      return true;
    },
  });

  if (options.commands !== false) {
    registerAddonCommands(core, (player, command, args) => { dispatch(core, player, command, args); });
  }

  publishDeclared(core);
}

/**
 * Announce what the build declared for this addon.
 *
 * Here rather than in `core.register()` because all of it is read off what the
 * build produced — the page's reference off its built tree, the guide's off the
 * compiled screens the generated module registers — and none of it is known
 * until the addon's own modules have been evaluated. `ui()` is the first point
 * where the addon is online AND everything it ships is loaded.
 *
 * Whatever the addon named in `core.register()` was already published by the
 * runtime; nothing here is generated for a part the addon declared itself.
 */
function publishDeclared(core: Runtime): void {
  const { page, translations } = declaredParts();

  // How a key this bundle did not compile resolves from here on: the framework's
  // own screens, then whatever any addon published. Installed once, so every
  // `navigate()` and every `<Link>` in this realm reaches another addon's screens.
  provideReferences(key => screenReferenceFor(core, key));

  announce(translations, bundle => core.translations.provide(bundle));
  // Every static screen this addon compiled, so any realm can show them: a guide's
  // pages, a menu, anything whose presses are links. Empty for an addon that
  // compiled none, which publishes an empty table rather than nothing.
  core.screens.provide(addonReference(core.id));
  announce(page, screen => core.pages.provide(addonPageReference(screen)));
}

/**
 * Announce one part, if there is one and the runtime has somewhere to put it.
 *
 * The registries an addon's runtime carries grow over time — `core.pages` is
 * newer than the first of them — and an addon is free to ship an older one than
 * the UI it mounts. A part with nowhere to go is simply not announced: the
 * addon keeps its screens, and the one thing that would have read it elsewhere
 * does without.
 */
function announce<T>(part: T | undefined, provide: (part: T) => void): void {
  if (part === undefined) {
    return;
  }

  try {
    provide(part);
  } catch (error: unknown) {
    console.warn(`[config] this runtime cannot announce one of the build's declarations: ${String(error)}`);
  }
}

/**
 * Send a fired command to whoever should answer it: this realm when it is the host, otherwise
 * the elected host over RPC.
 */
function dispatch(core: Runtime, player: Player, command: OpenCommand, args: (string | undefined)[]): void {
  if (core.host.isHost) {
    void openUi(core, player, openTargetFrom(command, args));

    return;
  }

  core.rpc.typed<HostUiRpc>(core.host.hostId)['core:ui.open']({ playerId: player.id, command, args })
    .catch((error: unknown) => {
      // The host went down between the election and the request, or is wedged. Our own copy
      // may be older and buggier, but showing it beats the command doing nothing.
      console.warn(`[config] host '${core.host.hostId}' did not answer ${command} (${String(error)}) - opening locally`);

      void openUi(core, player, openTargetFrom(command, args));
    });
}

/**
 * Open the shared UI for a player, from your own code — an item use, a block interaction, an
 * event handler, anything. This is the same funnel the commands go through, which is why the
 * permission clamp lives here rather than in a screen.
 *
 * ```ts
 * world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
 *   if (itemStack.typeId !== 'drav0011_shop:guide_book') { return; }
 *
 *   openUi(core, source, { kind: 'guide', addonId: core.id });
 * });
 * ```
 *
 * The target picks the screen: `{ kind: 'list' }` for the addon browser, `{ kind: 'guide' }` for
 * an addon's guide, `{ kind: 'config' }` for its settings — each optionally naming an `addonId`,
 * and config additionally a `scope` and `scopeId` to open straight into one scope.
 *
 * `clampTarget` still applies, so a non-operator cannot reach past their own player scope even
 * if you pass a target that says otherwise. Values for a deep-linked config scope are fetched
 * before the first render.
 *
 * Renders in THIS realm. A typed command forwards to the elected host so the world's newest UI
 * answers it; a direct call is your own code and renders your own copy.
 *
 * Returns a promise that settles once the screen is handed to the renderer. From a ui-runtime
 * presser, RETURN it — `onPress={() => openUi(core, player, target)}` — so the handoff lands
 * inside the interactive transaction: deterministic, flash-free, and no `exit()` needed (the
 * renderer swaps the running app out itself). Outside a presser, `void openUi(...)` is fine.
 */
export function openUi(core: Runtime, player: Player, target: OpenTarget): Promise<void> {
  const clamped = clampTarget(target, player, core);

  // A compiled guide is walked from its screens' references with native forms — no app
  // rendered, nothing of the owning addon's script involved. Returned like the render below:
  // from a presser the handoff waits inside the transaction; on its own it just runs.
  if (clamped.kind === 'guide' && clamped.addonId !== undefined) {
    const key = guideKeyFor(core, clamped.addonId, { back: true });
    const addonId = clamped.addonId;

    if (key !== undefined) {
      return presentReference(target => screenReferenceFor(core, target), key, player)
        .then((ended): Promise<void> | void => {
          // The walk says WHY it ended, which nothing else can: a back press and a
          // player closing the form both answer the same nothing. Only a back goes
          // on to the list — a dismissal is the player leaving the UI.
          if (ended === 'back') {
            return openUi(core, player, { kind: 'list', addonId });
          }
        });
    }
  }

  // The compiled list when this build carries it: the sidebar is the host's,
  // the page for each addon is the addon's own, drawn from its pack. Its
  // presses come back here, so what they open is decided in one place.
  if (clamped.kind === 'list' && canPresentAddonList()) {
    presentAddonList(core, player, {
      config: (addonId): Promise<void> => openUi(core, player, { kind: 'config', addonId }),
      guide: (addonId): Promise<void> => openUi(core, player, { kind: 'guide', addonId }),
    }, clamped.addonId);

    return Promise.resolve();
  }

  // The compiled scope picker when this build carries it. Its rows come back
  // here with the scope chosen, so the roster, the sections and the editor
  // are reached the way a command reaches them.
  if (clamped.kind === 'config' && clamped.addonId !== undefined && clamped.scope === undefined && canPresentScopePicker()) {
    presentScopePicker(core, player, clamped.addonId, {
      scope: (addonId, scope): Promise<void> => openUi(core, player, { kind: 'config', addonId, scope }),
      back: (addonId): Promise<void> => openUi(core, player, { kind: 'list', addonId }),
    });

    return Promise.resolve();
  }

  // The compiled roster and section screens when this build carries them:
  // a roster scope with no entity named lands on the roster, a level of the
  // tree holding only sections on the section list. Their presses come
  // back here with the level chosen.
  if (clamped.kind === 'config' && clamped.addonId !== undefined && clamped.scope !== undefined && clamped.list === undefined && canPresentMenuList()) {
    const { addonId, scope, scopeId } = clamped;

    if ((scope === 'dimension' || scope === 'player') && scopeId === undefined) {
      presentEntityRoster(core, player, { addonId, scope }, {
        entity: (id, at, entityId): Promise<void> => openUi(core, player, { kind: 'config', addonId: id, scope: at, scopeId: entityId }),
        back: (id): Promise<void> => openUi(core, player, { kind: 'config', addonId: id }),
      });

      return Promise.resolve();
    }

    const level: SectionTarget = {
      addonId,
      scope,
      entityId: scopeId,
      path: clamped.path ?? '',
      trail: clamped.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path: clamped.path }),
    };

    if (isSectionLevel(core, player, level)) {
      openLevel(core, player, level, levelOpeners(core, player));

      return Promise.resolve();
    }
  }

  // Never rejects: prefetchScopeValues catches internally, so floating this is safe.
  return prefetchScopeValues(core, player, clamped).then((values) => {
    // A list setting is a screen of its items rather than a form: the native
    // modal has no control for one. It needs the values, which is why it is
    // reached from here rather than with the section screens above.
    if (values !== undefined && presentCompiledList(core, player, clamped, values)) {
      return;
    }

    // The screen this addon's build shaped for the section, when it carries
    // one: everything about the section is baked into it, so only the values
    // travel.
    if (values !== undefined && presentShaped(core, player, clamped, values)) {
      return;
    }

    missing(player, clamped);
  });
}

/** Where a level of the tree sends its presses: every one comes back through `openUi`. */
const levelOpeners = (core: Runtime, player: Player): SectionListOpeners => ({
  editor: ({ addonId, scope, entityId, path, trail }): Promise<void> =>
    openUi(core, player, { kind: 'config', addonId, scope, scopeId: entityId, path, trail }),
  list: ({ addonId, scope, entityId, key, trail }): Promise<void> =>
    openUi(core, player, { kind: 'config', addonId, scope, scopeId: entityId, list: key, trail }),
  back: ({ addonId, scope, entityId }): Promise<void> =>
    openUi(core, player, scope === 'server' || entityId === undefined ? { kind: 'config', addonId } : { kind: 'config', addonId, scope }),
});

/**
 * Shows the section on the screen this addon's build shaped for it, when there
 * is one. False when something more general has to draw it.
 */
function presentShaped(core: Runtime, player: Player, target: OpenTarget, values: Record<string, unknown>): boolean {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined || target.list !== undefined) { return false; }

  const { addonId, scope, scopeId } = target;
  const path = target.path ?? '';
  const trail = target.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path });

  const accessor = core.config.of(addonId, { actorId: player.id });

  return accessor !== undefined && presentShapedEditor(accessor, player, { addonId, scope, entityId: scopeId, path, trail }, values);
}

/**
 * Shows the compiled list editor when this build carries it and the target
 * names a list. False when the serialized app has to draw it instead.
 */
function presentCompiledList(core: Runtime, player: Player, target: OpenTarget, values: Record<string, unknown>): boolean {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined || target.list === undefined) { return false; }

  if (!canPresentMenuList()) { return false; }

  const { addonId, scope, scopeId, list } = target;
  const trail = target.trail ?? trailOf(core, player, { addonId, scope, entityId: scopeId, path: list });

  presentListEditor(core, player, { addonId, scope, entityId: scopeId, path: '', key: list, trail }, values, levelOpeners(core, player));

  return true;
}

/**
 * Fetch the values a deep link needs BEFORE the first render.
 *
 * `Config` presents a native modal built from the values it is given, so it cannot fetch its
 * own: arriving empty and re-rendering would present the form twice. Every in-UI path already
 * fetches on the press that navigates — this is the same rule for the path that has no press,
 * and without it a command that names a scope opens showing schema defaults instead of what is
 * actually set. Resolves `undefined` whenever the target does not deep-link that far, and on
 * failure, which leaves the deep link to fall back to the scope pickers.
 */
async function prefetchScopeValues(
  core: Runtime,
  player: Player,
  target: OpenTarget,
): Promise<Record<string, unknown> | undefined> {
  if (target.kind !== 'config' || target.addonId === undefined || target.scope === undefined) { return undefined; }

  // Only the server scope identifies itself; the other two need to know which entity.
  if (target.scope !== 'server' && target.scopeId === undefined) { return undefined; }

  const accessor = core.config.of(target.addonId, { actorId: player.id });

  if (!accessor) { return undefined; }

  try {
    return await getScopeValues(accessor, target.scope, target.scopeId);
  } catch (error: unknown) {
    console.warn(`[config] prefetching '${target.addonId}' ${target.scope} values failed: ${String(error)}`);

    return undefined;
  }
}

/**
 * Nothing in this pack can draw what was asked for.
 *
 * Every screen the config UI needs is compiled into an addon's own pack from
 * what it declared, so reaching here means a pack that was built without the
 * ui-compile filter, or one built against a library that did not yet shape the
 * screen this target wants. Either is a build to fix, which is why it is said
 * here rather than papered over.
 */
function missing(player: Player, target: OpenTarget): void {
  const what = target.kind === 'config' && target.addonId !== undefined
    ? `${target.addonId} ${target.scope ?? 'config'}${target.path === undefined || target.path === '' ? '' : ` ${target.path}`}`
    : target.kind;

  console.error(`[config] no compiled screen for ${what} — build this pack with the ui-compile filter`);
  player.sendMessage({ translate: i18n.key($ => $.errors.notCompiled) });
}
