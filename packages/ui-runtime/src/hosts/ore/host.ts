import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { EXPERIMENTAL_ORE_TYPE } from '../../core/roots';
import type { HostContract } from '../types';

export const EXPERIMENTAL_ORE: HostContract = {
  id: 'experimental-ore-ui', label: 'experimental Ore UI', root: EXPERIMENTAL_ORE_TYPE,
  owners: ['player', 'build'], canvas: CANONICAL_SCREEN, compiled: true,
  carriers: ['bool', 'int', 'enum', 'text'],
  mechanisms: { Button: 'press', Select: 'change', Toggle: 'change', Slider: 'change', Dropdown: 'change', Option: 'field', Input: 'change' },
  refuse: kind => new Error(`\`${kind}\` is not supported by <Experimental_OreUI>. Use live controls and ordinary Button handlers on the screen.`),
};
