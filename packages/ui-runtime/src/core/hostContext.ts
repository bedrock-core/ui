import { createContext } from './fabric/context';
import type { HostId } from './roots';

/**
 * Which screen the subtree below is being drawn on, provided by the root that
 * names it.
 *
 * This is how one component set serves every host. A component is written
 * once, asks what it BECOMES here — `useMechanism` — and renders that; the
 * host's table answers, and a component the host has no mechanism for says so
 * by name instead of drawing something inert. Nothing above a host dispatches
 * on which host it is; a component asks what it is allowed to be.
 *
 * `undefined` means no root above, which is a screen with no host — the same
 * mistake `hostFor` refuses at the end of the build, caught earlier and closer
 * to the component that noticed.
 *
 * A leaf module on purpose: the roots provide this and the hook reads it, and
 * those two sit on opposite sides of the import graph.
 */
export const HostContext = createContext<HostId | undefined>(undefined);
