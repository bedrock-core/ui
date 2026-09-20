/**
 * What stands in a face's place, per host.
 *
 * The mirror of `faces/`. A face is data to a look; a connector is a look plus
 * an ADDRESS to a mechanism — the control that makes the look carry a value,
 * take a press, or hold an item. Everything a connector needs is in its own
 * payload, so a mechanism can be read on its own.
 *
 * Each host has its own entry point rather than one barrel, because the hosts
 * share names and nothing else: a form's press is an entry the engine reports,
 * a chest's is an item taken and put straight back.
 */

export type { Addressed, Connector, Definitions } from './types';
