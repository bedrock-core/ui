/**
 * What a player is allowed to reach in the config UI.
 *
 * This is the **caller-side** half of config authorization. It decides what a player is shown
 * and where a command drops them; the owning addon independently refuses requests it should
 * not serve (`authorization.ts` in `@bedrock-core/server-runtime`). Neither half is redundant:
 * an old realm falling back to its own frozen copy of this UI would skip the checks below, and
 * the runtime check is what stops it. Keeping the rule in both places is deliberate.
 *
 * It intentionally does NOT import the runtime's copy. This package depends on the runtime for
 * types only, and reaching for a value here would put a build-time edge back.
 */
import { PlayerPermissionLevel } from '@minecraft/server';
import type { Player } from '@minecraft/server';
import { hasVisiblePages } from '@bedrock-core/guides';
import type { GuideAudience } from '@bedrock-core/guides';
import type { Runtime } from '@bedrock-core/server-runtime';
import { manifestFor } from './frameworkGuide';
import { CONFIG_SCOPES, type ConfigScope } from './types';
import type { OpenTarget } from './navigation/openTarget';

/**
 * Whether the player is a world operator.
 *
 * Reads `playerPermissionLevel`, which is readonly, and never `commandPermissionLevel`, which
 * any script in the world can rewrite. `Custom` is a separate bucket rather than a tier above
 * `Operator`, so it is not accepted.
 */
export function isOperator(player: Player): boolean {
  return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
}

/**
 * Which slice of a guide this player reads. Guides gate pages with `access: op`, and the
 * renderer takes the audience rather than a `Player` — `@bedrock-core/guides` never imports
 * `@minecraft/server`, so deciding this is the host's job.
 */
export function guideAudienceFor(player: Player): GuideAudience {
  return isOperator(player) ? 'op' : 'player';
}

/** The config scopes this player may open. Non-operators get their own settings, nothing else. */
export function allowedScopes(player: Player): readonly ConfigScope[] {
  return isOperator(player) ? CONFIG_SCOPES : ['player'];
}

/**
 * Narrow a command's requested target to what the player may actually open.
 *
 * A non-operator asking for `server` — or for another player's settings — is silently pinned to
 * their own player scope rather than refused, because the useful thing to do when someone who
 * cannot edit the server opens the config is to show them the part they *can* edit. Pinning both
 * `scope` and `scopeId` also makes `buildInitialState` deep-link straight past the scope pickers,
 * so a plain `:config` drops a normal player onto their own settings and the screens they cannot
 * use never enter the stack.
 */
export function clampTarget(target: OpenTarget, player: Player, core: Runtime): OpenTarget {
  // A guide whose every page is gated has nothing in it for this player, and an index with no
  // rows is a dead end rather than an answer — so the request lands on the addon list instead,
  // with that addon selected. Clamping HERE rather than in the screen keeps the Guide route out
  // of the stack entirely, so backing out behaves like a plain `:list` (see `buildInitialState`).
  if (target.kind === 'guide') {
    const manifest = target.addonId === undefined ? undefined : manifestFor(core, target.addonId);

    return manifest !== undefined && hasVisiblePages(manifest, guideAudienceFor(player))
      ? target
      : { kind: 'list', addonId: target.addonId };
  }

  if (target.kind !== 'config' || isOperator(player)) { return target; }

  return { ...target, scope: 'player', scopeId: player.id };
}
