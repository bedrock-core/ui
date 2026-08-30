/**
 * What the build and the runtime agree on about a tree, before any host has
 * been consulted: what changes in it, and what it needs.
 *
 * Both halves run these: the build to decide a screen's shape and bake it, the
 * runtime to find the same handlers and values in the same order. Nothing here
 * knows how a need is met — that is the host's, under `hosts/`.
 */

export { analyze } from './analyze';
export type { Analysis } from './analyze';

export { claim, visibleCandidates, visiblesAt } from './claims';
export type { CellClaim, CellRole, ChannelClaim, Claims } from './claims';
