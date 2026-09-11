import type { Owner } from '../core/fabric';
import type { JSX } from '../jsx';

/**
 * A host: one Minecraft screen the library draws on, and the transport that
 * screen offers.
 *
 * Everything screen-specific belongs to a host — how a value reaches the
 * client, how an interaction reaches script, what a screen is laid out
 * against, and which vanilla file is hooked. Nothing above a host dispatches
 * on which host it is: a component says what it needs, and the host either
 * offers it or the build says so by name.
 *
 * The screens differ far more than they look. A form is serialized per player
 * and cannot change while it is open; a chest screen is compiled once and
 * everything alive in it travels through container slots, polled a tick at a
 * time. A component knows none of that, which is the point.
 */

/** What a host can carry for a value that changes at runtime. */
export type CarrierKind = 'bool' | 'int' | 'enum' | 'text';

/**
 * What a host can deliver to script.
 *
 *  - `press`  — a button was pressed.
 *  - `slot`   — an item moved through a cell of the screen's own container.
 *  - `field`  — a native control the engine owns while the screen is open.
 *  - `submit` / `cancel` — a form was submitted or dismissed.
 *  - `exit`   — the screen was closed.
 *
 * A component that needs one a host does not offer is refused at build, by
 * name, rather than drawn and left inert.
 */
export type InputKind = 'press' | 'slot' | 'field' | 'submit' | 'cancel' | 'exit';

/**
 * What a host can draw that is neither carried nor an input: a cell over a
 * collection the engine already publishes, which costs the screen nothing and
 * the runtime never touches.
 */
export type DrawKind = 'collection';

export type Capability = CarrierKind | InputKind | DrawKind;

/**
 * A component as the author writes it, which is what a host answers about.
 *
 * The library's own kinds, not the styled layer's: a `Checkbox` asks about a
 * `Toggle` and a `Radio` or `ToggleButtonGroup` about a `Select`, because
 * that is what each one IS once the look is set aside. Everything absent —
 * panels, text, images, fragments — draws on every host and asks nothing.
 */
export type ComponentKind
  = 'Button' | 'Toggle' | 'Select' | 'Option' | 'Slider' | 'Dropdown' | 'Input'
    | 'Form' | 'Submit' | 'Slot' | 'SlotGrid';

/**
 * What one kind of component BECOMES on a host.
 *
 * `local` is the one that costs the host nothing: the client draws it and
 * handles it, and script never hears about it. The rest are the host's own
 * transport, so each is a capability the screen spends.
 */
export type Mechanism = InputKind | DrawKind | 'local';

export interface HostContract {
  readonly id: 'chest' | 'form-action' | 'form-modal';
  /** For error messages: what the author calls this screen. */
  readonly label: string;
  /**
   * The `type` of the element that names this host at the root of a tree —
   * `<Container>` is a chest screen the way `<Form>` is a modal and
   * `<Screen>` an action form — so a screen declares its host in the one
   * place a reader looks, and there is no default.
   */
  readonly root: string;
  /** Who may serve a screen of this host. A container screen belongs to an entity; a form to a player. */
  readonly owners: readonly Owner['kind'][];
  /** The canvas a screen is laid out against, in texels. */
  readonly canvas: { readonly width: number; readonly height: number };
  /**
   * Whether a screen of this host is baked at build time by DEFAULT, for the
   * callers that do not say. It is the host's usual answer, not the truth about
   * a given screen: the form host serves both a screen serialized per present
   * and one compiled into the pack, and only the caller knows which it holds.
   * Anything that turns on a frozen layout — reserving a live string's width,
   * refusing to bake it into a button face — reads `buildTree`'s answer.
   */
  readonly compiled: boolean;
  /** What a value that changes at runtime can travel on here. */
  readonly carriers: readonly CarrierKind[];
  /**
   * What each kind of component becomes here. This is the whole of what a host
   * offers a component: a kind the table names is drawn through that
   * mechanism, and a kind it does not name has nothing to be here and is
   * refused at build by name. One table rather than a flat list of
   * capabilities, because "a `Toggle` is a native field on the modal and a
   * pressed button on the action form" is the fact both the component and the
   * check need, and neither can read it off a list.
   */
  readonly mechanisms: Readonly<Partial<Record<ComponentKind, Mechanism>>>;
  /**
   * How this host explains a component it cannot serve. The wording belongs to
   * the host because the FIX does: the same `Slider` is "put it inside a
   * `<Form>`" on one screen and "a container has no native form" on another.
   */
  refuse(kind: ComponentKind): Error;
  /**
   * What the host demands of the root itself, beyond the rules every screen
   * obeys — a compiled screen names its entity and fits a fixed canvas.
   */
  check?(tree: JSX.Element): void;
}
