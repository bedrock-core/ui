import { SCREEN } from '@bedrock-core/flexbox';
import { runOreClient } from './client.browser.js';

/** Standalone Gameface adapter emitted only when an experimental Ore screen is compiled. */
export const ORE_CLIENT_SOURCE = `(${runOreClient.toString()})(${SCREEN.DESKTOP.width},${SCREEN.DESKTOP.height});`;
