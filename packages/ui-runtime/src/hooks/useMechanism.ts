import { HostContext } from '../core/hostContext';
import { ScreenRootError } from '../core/types';
import { HOSTS, type ComponentKind, type HostContract, type Mechanism } from '../hosts';
import { useContext } from './useContext';

/**
 * What this kind of component becomes on the screen it is being drawn on.
 *
 * The seam that lets one component serve every host: a `Toggle` is written
 * once, asks this, and renders the native field it gets on a modal or the
 * pressed button it gets on a screen of buttons. What differs between hosts is
 * the mechanism, never the component.
 *
 * A host with no mechanism for the kind cannot draw one at all, and this
 * throws the host's own refusal rather than returning nothing: the wording
 * belongs to the screen, because the fix does, and a component that got an
 * answer it could not use would only draw something inert.
 *
 * @param kind - What the author wrote, as the host's table names it.
 * @throws the host's refusal when it has no mechanism for this kind.
 */
export function useMechanism(kind: ComponentKind): Mechanism {
  const host = hostOf(useContext(HostContext), kind);
  const mechanism = host.mechanisms[kind];

  if (mechanism === undefined) {
    throw host.refuse(kind);
  }

  return mechanism;
}

/** The contract behind an id, or the rootless-screen error naming what noticed. */
const hostOf = (id: string | undefined, kind: ComponentKind): HostContract => {
  const host = HOSTS.find(candidate => candidate.id === id);

  if (host === undefined) {
    throw new ScreenRootError(
      `\`${kind}\` is being drawn on no screen at all: nothing above it names a host. `
      + 'Write one root at the top of the screen: `<Screen>` for an action form, '
      + '`<Form>` for a modal, `<Container entity="…">` for a container screen.',
    );
  }

  return host;
};
