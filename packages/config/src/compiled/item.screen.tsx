/** @jsxImportSource @bedrock-core/ui-runtime */
import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';
import { ITEM_FIELD, sheet, type LeafProps } from './shaped';

const { key } = i18n;

/**
 * One item of a list, on a screen that belongs to no addon in particular.
 *
 * A shaped screen is compiled into the pack of the addon whose schema it was
 * written for — and the realm that draws config is the ELECTED HOST, which is
 * usually somebody else. The host has every shaped screen of its own and none
 * of the addon's it is drawing, so a list item had nowhere to be edited.
 *
 * These two are the fallback, compiled into every addon by the same setting
 * that bakes the rest of this package's screens. An item is one field and
 * nothing else, so a generic one costs nothing a shaped one would have saved:
 * the trail already says which list this is, the value travels per present, and
 * a dropdown's options travel with it — the engine reads those off the modal
 * row rather than off the bake.
 *
 * Two screens rather than one with both fields: which control an item wants is
 * decided by the LIST, not by the moment, so the host picks the screen and
 * neither carries a field it will not draw.
 */

/** A list of free strings: the item is typed. */
export const ListItemText = ({ model }: LeafProps): JSX.Element =>
  sheet(model, [[ITEM_FIELD, { type: 'string', default: '', label: key($ => $.list.item) }]]);

/** A list drawn from a set: the item is chosen from what is still free. */
export const ListItemChoice = ({ model }: LeafProps): JSX.Element =>
  sheet(model, [[ITEM_FIELD, { type: 'enum', default: '', options: [], label: key($ => $.list.item) }]]);

/**
 * The two, as the screen registry types them.
 *
 * A shaped screen is registered by name and rendered with `shapedElement`, which
 * takes what the registry holds; these are the same thing with the field's label
 * coming from this package rather than from a schema.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a screen's props are the present's, never the registry's
export const listItemText = ListItemText as FunctionComponent;
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- as above
export const listItemChoice = ListItemChoice as FunctionComponent;
