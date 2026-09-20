import type { ItemStack, Player } from '@minecraft/server';
import type { JSX } from '../../../../jsx';
import type { SlotEntry } from '../../allocate';
import { BUTTON_STACK } from '../items';
import { give, reclaimGuard } from '../players';
import type { PollHost } from '../poll';
import { resync } from '../watch';
import { type CellBehavior, isHandler, type PressHandler, validHost, validPlayer } from './types';

/** Whether a button takes presses: the transport item is the enabled state. */
export const isEnabled = (element: JSX.Element): boolean => element.props.enabled !== false;

/** The look a button's item carries: the one it wears, or the first for a button drawn one way. */
const lookOf = ({ look }: SlotEntry): number => look ?? 0;

/** Runs a button's handler for the player who pressed it. */
const fire = (host: PollHost, entry: SlotEntry, player: Player): void => {
  const { onPress } = entry.element.props;

  host.handle(() => {
    if (isHandler<PressHandler>(onPress) && validPlayer(player) && validHost(host.host)) {
      onPress({ player, host: host.host, container: host.cells });
    }
  });
  host.trace(`press slot ${entry.slot}`);
};

/**
 * Dropped transports. A drop IS a press: every input a button routes is
 * `button.drop_one`, so one transport leaves for the world, never for a
 * cursor or an inventory, and `entityItemDrop` names the player who dropped
 * it. Every transport that left is one press.
 *
 * The slot holds a stack, so a press leaves the rest behind and the stack is
 * topped up in place: the slot is never empty and keeps the same item, so a
 * click that follows fast still names an item the server has. Only a slot
 * emptied outright takes a new one.
 *
 * Within a tick the poll sees the drop BEFORE the drop event arrives —
 * measured — so a press with no dropper on record yet is left pending, and
 * the next poll reports it (see {@link firePending}).
 */
const press = (host: PollHost, entry: SlotEntry, before: ItemStack, after: ItemStack | undefined): void => {
  const { slot } = entry;
  const left = after !== undefined && host.items.isTransport(after) ? after.amount : 0;
  // What a stack lost is how many drops there were. A slot emptied outright
  // lost it all some other way than one drop per click, and counts once.
  const presses = left > 0 ? Math.max(1, before.amount - left) : 1;

  // A player's own item placed where the transport was goes back to them
  // rather than being overwritten.
  if (after !== undefined && !host.items.isOwned(after)) {
    give(host.drops[0] ?? host.viewers[0], after);
  }

  if (left > 0) {
    host.container.getSlot(slot).amount = BUTTON_STACK;
  } else {
    host.container.setItem(slot, host.items.transport(lookOf(entry)));
  }

  resync(host.container, host.watch, [slot]);

  for (let count = 0; count < presses; count += 1) {
    const dropper = host.drops.shift();

    if (dropper === undefined) {
      host.waiting.set(slot, (host.waiting.get(slot) ?? 0) + 1);
      host.trace(`press slot ${slot} — waiting for its drop event`);
    } else {
      fire(host, entry, dropper);
    }
  }
};

/**
 * Reports every press the previous poll left pending, now that the drop
 * events of that tick have arrived: to the player each event named, or to the
 * first viewer when none did — something other than a drop emptied the slot.
 */
export const firePending = (host: PollHost): void => {
  for (const [slot, presses] of [...host.waiting]) {
    host.waiting.delete(slot);

    const entry = host.slots.find(candidate => candidate.slot === slot);

    for (let count = 0; entry !== undefined && count < presses; count += 1) {
      fire(host, entry, host.drops.shift() ?? host.viewers[0]);
    }
  }
};

/**
 * A disabled button's slot was disturbed: it holds guards, not transports, so
 * this is never a press. A press on it drops a guard, which is topped up in
 * place the way a transport is; any item a player put there goes back, and a
 * slot emptied outright is refilled — so a disabled button stays inert and
 * never fires.
 */
const settleButton = (host: PollHost, entry: SlotEntry, after: ItemStack | undefined): void => {
  const { slot } = entry;

  if (after !== undefined && !host.items.isOwned(after)) {
    give(host.viewers[0], after);
  }

  reclaimGuard(host.viewers, host.items);

  if (after !== undefined && host.items.isGuard(after) && host.items.valueOf(after) === lookOf(entry)) {
    host.container.getSlot(slot).amount = BUTTON_STACK;
  } else {
    host.container.setItem(slot, host.items.guard(lookOf(entry), BUTTON_STACK));
  }

  resync(host.container, host.watch, [slot]);
  host.trace(`button slot ${slot} — disabled, held`);
};

/**
 * A button: a container slot whose item is pure transport.
 *
 * The transport item IS the enabled state: a slot with them presses. A
 * disabled button holds guards instead of nothing, so its slot is never empty
 * — a shift-click cannot auto-place into it, and the face, gated on the guard,
 * reads disabled. So `enabled={ready}` works the way it reads. An
 * unchanged button costs one read.
 */
export const buttonCell: CellBehavior = {
  role: 'button',

  // The item's current durability is the look the button wears, so the face
  // gated on that value is the one showing. A new look needs a new item — its
  // durability cannot be changed in place — while a short stack of the right
  // look is only topped up.
  settle(container, entry, items) {
    const { element, slot } = entry;
    const item = container.getItem(slot);
    const look = lookOf(entry);

    if (isEnabled(element)) {
      if (item && items.isTransport(item) && items.valueOf(item) === look) {
        if (item.amount !== BUTTON_STACK) {
          container.getSlot(slot).amount = BUTTON_STACK;
        }
      } else {
        container.setItem(slot, items.transport(look));
      }
    } else if (item && items.isGuard(item) && items.valueOf(item) === look) {
      if (item.amount !== BUTTON_STACK) {
        container.getSlot(slot).amount = BUTTON_STACK;
      }
    } else {
      container.setItem(slot, items.guard(look, BUTTON_STACK));
    }
  },

  changed(host, entry, before, after) {
    if (before !== undefined && host.items.isTransport(before)) {
      press(host, entry, before, after);
    } else {
      settleButton(host, entry, after);
    }
  },
};
