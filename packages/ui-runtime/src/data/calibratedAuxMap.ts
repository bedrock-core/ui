import { ItemTypes } from '@minecraft/server';
import type { ItemAuxData, ItemAuxMap } from './ItemAux';

const cache = new WeakMap<ItemAuxData, ItemAuxMap>();

// Called lazily on first screen render (inside a player event handler),
// never at module load time where native APIs are unavailable.
export function getCalibratedAuxMap(data: ItemAuxData): ItemAuxMap {
  const hit = cache.get(data);

  if (hit !== undefined) {
    return hit;
  }

  // All minecraft: keys in the generated map are known vanilla items.
  // Extras found by ItemTypes.getAll() that aren't here are developer-only
  // items absent from the public API — they displace subsequent raw_ids.
  const knownVanilla = new Set<string>(
    Object.keys(data.items).filter(k => k.startsWith('minecraft:')),
  );

  const extraDevItemCount = ItemTypes.getAll()
    .filter(t => t.id.startsWith('minecraft:') && !knownVanilla.has(t.id))
    .length;

  if (extraDevItemCount === 0) {
    cache.set(data, data.items);

    return data.items;
  }

  // Items with aux >= correctionBoundaryAux are vanilla items whose actual
  // game raw_id is displaced upward by extraDevItemCount slots.
  const { correctionBoundaryAux } = data;
  const correction = extraDevItemCount * 65536;
  const map: Record<string, number> = {};

  for (const [typeId, aux] of Object.entries(data.items)) {
    map[typeId] = aux >= correctionBoundaryAux ? aux + correction : aux;
  }

  cache.set(data, map);

  return map;
}
