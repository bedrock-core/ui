import { HostContext } from '../core/hostContext';
import { EXPERIMENTAL_ORE_TYPE } from '../core/roots';
import type { FunctionComponent, JSX } from '../jsx';

/** @experimental Requires Minecraft server-ui 2.2 and the matching Ore resource assets. */
export interface ExperimentalOreUIProps {
  children?: JSX.Node;
  /** Screen title used to identify its native backing transport. */
  title?: string;
  /** Fixed pixels per layout unit, or viewport-based integer scaling when omitted. Does not read the game's GUI-scale setting. */
  uiScale?: number;
}

/**
 * @experimental An Ore presentation backed by a persistent native DDUI form.
 * Controls update through their own value/change props and ordinary button handlers.
 */
export const Experimental_OreUI: FunctionComponent<ExperimentalOreUIProps> = ({ children, title, uiScale }) =>
  HostContext({ value: 'experimental-ore-ui', children: { type: EXPERIMENTAL_ORE_TYPE, props: { children, title, uiScale } } });
