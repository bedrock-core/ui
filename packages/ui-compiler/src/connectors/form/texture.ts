import { FULL, topLeft } from '../../faces';
import { entryHost, entryText } from './entry';
import type { Addressed, Connector, Control } from '../types';

/** The one definition a screen's live images share; nothing about the look varies. */
export const TEXTURE_DEF = 'live_image';

/** The property an image's `texture` reads from: vanilla's own name for a bound texture. */
const TEXTURE_PROPERTY = '#texture';

/**
 * A live texture: the entry's string IS the path.
 *
 * One definition per screen, because there is nothing to vary — the host sizes
 * the image, the entry names it.
 */
export const texture: Connector<Addressed> = (data, face, ctx) => {
  ctx.defs[data.definition] ??= textureDef(ctx.collection);

  return entryHost(data.name, data.address, `${ctx.ns}.${data.definition}`, face, ctx.collection);
};

/** The carrier definition: an image whose path is whatever the entry says. */
export const textureDef = (collection: string): Control => ({
  type: 'image',
  size: FULL,
  ...topLeft,
  keep_ratio: false,
  texture: TEXTURE_PROPERTY,
  bindings: entryText(TEXTURE_PROPERTY, collection),
});
