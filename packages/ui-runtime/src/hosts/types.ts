import type { Owner } from '../core/fabric';
import type { Need } from '../core/ir/validate';
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

export interface HostContract {
  readonly id: 'chest' | 'form-action' | 'form-modal';
  /** For error messages: what the author calls this screen. */
  readonly label: string;
  /**
   * Whether this host claims a built tree. Decided by the root the author
   * wrote — `<Container>` is a chest screen the way `<Form>` is a modal — so
   * a screen declares its host in the one place a reader looks.
   */
  claims(roots: readonly JSX.Element[], tree: JSX.Element): boolean;
  /** Who may serve a screen of this host. A container screen belongs to an entity; a form to a player. */
  readonly owners: readonly Owner['kind'][];
  /** The canvas a screen is laid out against, in texels. */
  readonly canvas: { readonly width: number; readonly height: number };
  /**
   * How many independent scroll regions the host can draw. A form draws its
   * scrolls from the render pack's fixed pool; a compiled screen emits a
   * region per `<Scroll>`, so nothing caps it.
   */
  readonly scrollLimit: number;
  /** Whether the layout is baked at build time rather than serialized per present. */
  readonly compiled: boolean;
  /** What the host offers. A need outside this set is a build error naming both. */
  readonly offers: readonly Capability[];
  /**
   * How this host explains a control it cannot serve. The wording belongs to
   * the host because the FIX does: the same `Form.Slider` is "put it inside a
   * `<Form>`" on one screen and "a container has no native form" on another.
   */
  refuse(need: Need): Error;
  /**
   * What the host demands of the root itself, beyond the rules every screen
   * obeys — a compiled screen names its entity and fits a fixed canvas.
   */
  check?(tree: JSX.Element): void;
}
