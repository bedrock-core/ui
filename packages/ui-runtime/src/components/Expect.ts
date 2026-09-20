import { type HostId, isHostId } from '../core/roots';
import type { FunctionComponent, JSX } from '../jsx';

/**
 * The host `type` emitted by {@link Expect}. Registered transparent: it draws
 * nothing and its children are laid out as though it were not there.
 */
export const EXPECT_SLOT_TYPE = 'expect-host';

export interface ExpectProps {
  /** The screen this fragment is written for. */
  host: HostId;
  children?: JSX.Node;
}

/**
 * States which screen a fragment is written for, and fails the build by name
 * when it is drawn on another.
 *
 * A root names the host, so anything under it already knows what it becomes.
 * This is for the other case: a component library that renders INTO a screen
 * it does not own — a set of fields meant for a modal, exported as a fragment
 * for an addon to place. Written at the top of that fragment, it says what the
 * library assumed, and an addon that drops it on the wrong screen is told
 * where, once, instead of being told about each field in turn.
 *
 * ```tsx
 * export const AccountFields = (): JSX.Element => (
 *   <Expect host={'form-modal'}>
 *     <Input name={'nickname'} label={'Nickname'} />
 *     <Toggle name={'notify'} label={'Notify me'} />
 *   </Expect>
 * );
 * ```
 */
export const Expect: FunctionComponent<ExpectProps> = ({ host, children }: ExpectProps): JSX.Element => ({
  type: EXPECT_SLOT_TYPE,
  props: { __expect: host, children },
});

/** The host a built `<Expect>` names, read off the element. */
export function expectedHost(element: JSX.Element): HostId | undefined {
  const expected = element.props.__expect;

  return isHostId(expected) ? expected : undefined;
}
