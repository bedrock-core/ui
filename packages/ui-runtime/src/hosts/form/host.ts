import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { MODAL_FORM_SLOT_TYPE, SCREEN_TYPE } from '../../core/roots';
import { ContainerScreenError, ModalFormError } from '../../core/types';
import type { ComponentKind, HostContract } from '../types';

/** The two kinds that only a container screen can draw. */
const isContainerOnly = (kind: ComponentKind): boolean => kind === 'Slot' || kind === 'SlotGrid';

/**
 * A control that needs a container. Both form hosts answer this the same way,
 * because the reason is the same: there is no container behind a form.
 */
const noContainer = (kind: ComponentKind): Error => new ContainerScreenError(
  `\`${kind}\` only exists in a container screen. Wrap the screen in `
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
  // A form belongs to the player it is shown to. The build renders it too —
  // once, with initial state, to decide the shape it will be compiled at — the
  // same way it renders a container screen, and for the same reason.
  owners: ['player', 'build'],
  canvas: CANONICAL_SCREEN,
  compiled: false,
} as const;

/** A `<Screen>` at the root: an `ActionFormData` screen of buttons and decorative cells. */
export const FORM_ACTION: HostContract = {
  ...FORM,
  id: 'form-action',
  label: 'form',
  root: SCREEN_TYPE,
  carriers: ['bool', 'int', 'enum', 'text'],

  // Everything the action form draws, it draws as a button it hears back: a
  // toggle is a button that flips a carried bool, a chooser one button per
  // option. What it has no answer for is a control the ENGINE owns — there is
  // no native field on a screen of buttons — so the typed three are absent.
  mechanisms: {
    Button: 'press',
    Toggle: 'press',
    Select: 'press',
    Option: 'press',
  },

  // Two ways to reach here: a container control on a screen with no container,
  // and a modal control on a screen that is not a modal. The second is nearly
  // always a `<Form>` the author forgot to wrap the fields in.
  refuse: kind => (isContainerOnly(kind)
    ? noContainer(kind)
    : new ModalFormError(
        `\`${kind}\` must be rendered inside a \`<Form>\`. The native modal is what `
        + 'draws a typed control; outside one there is nothing for it to be.',
      )),
};

/** A `<Form>` at the root: one native `ModalFormData` with a single atomic submit. */
export const FORM_MODAL: HostContract = {
  ...FORM,
  id: 'form-modal',
  label: 'modal form',
  root: MODAL_FORM_SLOT_TYPE,
  carriers: ['bool', 'int', 'enum', 'text'],

  // The one host with typed controls: every field is the engine's, owned by it
  // while the screen is open and returned in one answer on submit. `Button` is
  // absent on purpose — a native modal has no generic button slot, only its own
  // submit and dismiss, which is what `Submit` is.
  mechanisms: {
    Form: 'submit',
    Submit: 'submit',
    Toggle: 'field',
    Select: 'field',
    Option: 'field',
    Slider: 'field',
    Dropdown: 'field',
    Input: 'field',
  },

  refuse: kind => (isContainerOnly(kind)
    ? noContainer(kind)
    : new ModalFormError(
        `\`${kind}\` is not allowed inside a \`<Form>\`. A native modal draws only its `
        + 'typed fields plus the submit and exit buttons; use a submit or exit button for '
        + 'an action, or move the control to a screen of its own.',
      )),
};
