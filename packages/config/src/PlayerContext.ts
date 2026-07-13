import { createContext } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';

/** The player this UI session is rendering for — needed to resolve "self"/"current dimension" scopes. */
export const PlayerContext = createContext<Player | null>(null);
