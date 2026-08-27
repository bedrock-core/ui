import type { ItemStack } from '@minecraft/server';
import type { JSX } from '../../jsx';
import type { SlotEntry } from '../allocate';
import { guard, isGuard, isOwned, isTransport, transport } from '../items';
import { actorOf, give, reclaim, reclaimGuard } from '../players';
import type { PollHost } from '../poll';
import { resync } from '../watch';
import { type CellBehavior, isHandler, type PressHandler, validHost, validPlayer } from './types';

/** Whether a button takes presses: the transport item is the enabled state. */
export const isEnabled = (element: JSX.Element): boolean => element.props.enabled !== false;

/**
 * A moved transport. The move IS the press: the copy is taken away, whatever
 * the component attached is run for the viewer it was found on, and the
 * buttons settle afterwards — the handler may have disabled this one or
 * enabled another, and the render decides which slots hold a transport now,
 * this one included.
 */
const press = (host: PollHost, entry: SlotEntry, after: ItemStack | undefined): void => {
  const { container, viewers } = host;
  const { slot, element } = entry;
  const actor = reclaim(container, viewers, host.slots, slot) ?? viewers[0];

  // A press empties the slot, but a swap FILLS it: the player drops what they
  // were carrying where the transport was. Overwriting the slot would destroy
  // an item that is theirs, so it goes back first.
  if (after && !isOwned(after)) {
    give(actor, after);
    container.setItem(slot, undefined);
  }

  const { onPress } = element.props;

  host.handle(() => {
    if (isHandler<PressHandler>(onPress) && validPlayer(actor) && validHost(host.entity)) {
      onPress(actor, host.entity);
    }
  });
  host.trace(`press slot ${slot}`);
};

/**
 * A disabled button's slot was disturbed: it holds the invisible placeholder,
 * not a transport, so this is never a press. Any item the player dropped there
 * goes back, the placeholder is pulled off whoever took it, and the slot is
 * refilled — so a disabled button stays inert and never fires.
 */
const settleButton = (host: PollHost, entry: SlotEntry, after: ItemStack | undefined): void => {
  const { slot } = entry;

  if (after !== undefined && !isOwned(after)) {
    give(actorOf(host.ledger, host.viewers, undefined, after), after);
  }

  reclaimGuard(host.viewers);
  host.container.setItem(slot, guard());
  resync(host.container, host.watch, [slot]);
  host.trace(`button slot ${slot} — disabled, held`);
};

/**
 * A button: a container slot whose item is pure transport.
 *
 * The transport item IS the enabled state: a slot with one presses, and the
 * face reads the same fact to draw itself. A disabled button holds the
 * invisible placeholder instead of nothing, so its slot is never empty — a
 * shift-click cannot auto-place into it, and the face, gated on the transport,
 * still reads disabled. So `enabled={ready}` works the way it reads. An
 * unchanged button costs one read.
 */
export const buttonCell: CellBehavior = {
  role: 'button',

  settle(container, { element, slot }) {
    const item = container.getItem(slot);

    if (isEnabled(element)) {
      if (!(item && isTransport(item))) {
        container.setItem(slot, transport());
      }
    } else if (!(item && isGuard(item))) {
      container.setItem(slot, guard());
    }
  },

  changed(host, entry, before, after) {
    if (before !== undefined && isTransport(before)) {
      press(host, entry, after);
    } else {
      settleButton(host, entry, after);
    }
  },
};
