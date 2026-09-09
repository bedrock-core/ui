import { openGuide } from '@bedrock-core/guides';
import { openGallery } from '@bedrock-core/generated/ui';
import { render, type PressEvent, type SubmitEvent } from '@bedrock-core/ui';
import { createContainerScreen } from '@bedrock-core/ui/container';
import { type Block, ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { i18n } from './i18n';
import Locker from './screens/locker.screen';
import { type PlayerRow, playersElement } from './screens/players.screen';
import { preferencesElement } from './screens/preferences.screen';

const { t } = i18n;

/**
 * The locker, served: the screen names its entity, the build sized that
 * entity's inventory, and this attaches the behaviour to every one spawned.
 */
const locker = createContainerScreen(Locker);

/**
 * Nothing opens a container from script, so a locker is an entity in the
 * world, opened by interacting with it. One per button, on top of it.
 */
const spawnLocker = (button: Block): void => {
  const { dimension } = button;

  for (const existing of dimension.getEntities({ type: locker.entity })) {
    existing.remove();
  }

  dimension.spawnEntity(locker.entity, { x: button.x + 0.5, y: button.y + 1, z: button.z + 0.5 });
};

/**
 * `source` is typed as always present and is not: a button pushed by redstone,
 * an arrow, or anything that is not an entity delivers the event with none.
 */
const isPlayer = (source: ButtonPushAfterEvent['source'] | undefined): source is Player =>
  source?.typeId === MinecraftEntityTypes.Player;

/** Everyone online, the viewer included; a row is a visit to where that player stands. */
const playersFor = (viewer: Player): PlayerRow[] => world.getAllPlayers().map(other => ({
  name: other.id === viewer.id ? `${other.name} (you)` : other.name,
  onVisit: ({ player }: PressEvent): void => {
    if (other.id !== player.id) {
      player.teleport(other.location, { dimension: other.dimension });
    }
  },
}));

const savePreferences = ({ player, values }: SubmitEvent): void => {
  player.sendMessage(`§a${t($ => $.ui.preferences.saved)}§r ${JSON.stringify(values)}`);
};

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (!isPlayer(source)) {
    return;
  }

  if (block.typeId === MinecraftBlockTypes.BambooButton) {
    // The gallery: every compiled screen of this pack as faces alone, before
    // any host serves it. Built by the development profile only.
    openGallery(source, { debug: true });
  }

  if (block.typeId === MinecraftBlockTypes.MangroveButton) {
    // The guide, compiled: the guides filter wrote one screen module per page
    // and the build baked each; every press renders the next page for this
    // player, so nothing about a page travels at runtime.
    openGuide('core', source, { debug: true });
  }

  if (block.typeId === MinecraftBlockTypes.JungleButton) {
    // An action form with a list and a scroll, filled per viewer.
    render(playersElement(playersFor(source)), source, { debug: true });
  }

  if (block.typeId === MinecraftBlockTypes.WoodenButton) {
    // A modal with every field kind.
    render(preferencesElement(savePreferences), source, { debug: true });
  }

  if (block.typeId === MinecraftBlockTypes.CrimsonButton) {
    // A chest screen: the locker entity to interact with.
    spawnLocker(block);
  }
});
