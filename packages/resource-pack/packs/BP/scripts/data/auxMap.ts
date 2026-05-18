import { typeIdToDataId, typeIdToID } from './typeIds';

const NUMBER_OF_CUSTOM_ITEMS = 0;

const encode = (id: number): number =>
  Math.floor((id + (id < 256 ? 0 : NUMBER_OF_CUSTOM_ITEMS)) * 65536);

export const itemAuxMap: Record<string, number> = {};

for (const [k, v] of typeIdToID) {
  itemAuxMap[k] = encode(v);
}

for (const [k, v] of typeIdToDataId) {
  itemAuxMap[k] = encode(v);
}
