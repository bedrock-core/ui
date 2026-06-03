import type { JSX } from '../jsx';
import defaultData from '@bedrock-core/generated/item-aux';
import { ItemAuxContext } from './ItemAuxContext';
import { getCalibratedAuxMap } from './calibratedAuxMap';
import type { ItemAuxData } from './ItemAuxData';

interface ItemAuxProviderProps {
  data?: ItemAuxData;
  children: JSX.Node;
}

export function ItemAuxProvider({ data = defaultData, children }: ItemAuxProviderProps): JSX.Element {
  return (
    <ItemAuxContext value={getCalibratedAuxMap(data)}>
      {children}
    </ItemAuxContext>
  );
}
