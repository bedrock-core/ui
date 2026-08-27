import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { findModalConfig } from '../../components/Form';
import { MAX_POOLED_SCROLLS } from '../../components/Scroll';
import type { Need } from '../../core/ir/validate';
import { ContainerScreenError, ModalFormError } from '../../core/types';
import type { HostContract } from '../types';

/**
 * A control that needs a container. Both form hosts answer this the same way,
 * because the reason is the same: there is no container behind a form.
 */
const noContainer = (need: Need): Error => new ContainerScreenError(
  `\`${need.label}\` only exists in a container screen. Wrap the screen in `
  + '`<Container entity="…">` and serve it with createContainerScreen.',
);

/**
 * The two server-form hosts.
 *
 * Both are a screen shown to ONE player and serialized for them when it is
 * shown, which is what they have in common and what separates them from a
 * compiled screen: nothing in a form changes while it is open. A state change
 * re-presents the whole thing.
 *
 * They differ in what the engine gives back. An `ActionFormData` is a list of
 * buttons and returns which one was pressed, so it offers `press` and nothing
 * typed. A `ModalFormData` has typed controls the engine owns while the screen
 * is open and returns every value at once on submit, so it offers `field`,
 * `submit` and `cancel` — and no `press` at all, since it has no generic
 * button slot beyond its own submit and dismiss.
 *
 * Neither has a container behind it, so neither offers `slot` or `collection`:
 * a `<Slot>` on a form is refused at build rather than drawn inert.
 */

const FORM = {
  owners: ['player'],
  canvas: CANONICAL_SCREEN,
  // A form draws its scrolls from the render pack's fixed pool.
  scrollLimit: MAX_POOLED_SCROLLS,
  compiled: false,
} as const;

/** The default: an `ActionFormData` screen of buttons and decorative cells. */
export const FORM_ACTION: HostContract = {
  ...FORM,
  id: 'form-action',
  label: 'form',
  // The fallback host. A tree no other host claims is an ordinary form, which
  // is why this entry is last in the registry.
  claims: () => true,
  offers: ['bool', 'int', 'enum', 'text', 'press', 'exit'],

  // Two ways to reach here: a container control on a screen with no container,
  // and a modal control on a screen that is not a modal. The second is nearly
  // always a `<Form>` the author forgot to wrap the fields in.
  refuse: need => (need.capability === 'slot' || need.capability === 'collection'
    ? noContainer(need)
    : new ModalFormError(
        `\`${need.label}\` must be rendered inside a \`<Form>\`. The native modal is what `
        + 'draws a typed control; outside one there is nothing for it to be.',
      )),
};

/** A `<Form>` anywhere on the tree: one native `ModalFormData` with a single atomic submit. */
export const FORM_MODAL: HostContract = {
  ...FORM,
  id: 'form-modal',
  label: 'modal form',
  claims: (_roots, tree) => findModalConfig(tree) !== undefined,
  offers: ['bool', 'int', 'enum', 'text', 'field', 'submit', 'cancel', 'exit'],

  // A native modal has no generic button slot — only its own submit and
  // dismiss — so an ordinary `<Button>` has nothing to become.
  refuse: need => (need.capability === 'slot' || need.capability === 'collection'
    ? noContainer(need)
    : new ModalFormError(
        `\`${need.label}\` is not allowed inside a \`<Form>\`. A native modal draws only its `
        + 'typed fields plus the submit and exit buttons; use `Form.Button` for an action, '
        + 'or move the control to a screen of its own.',
      )),
};
