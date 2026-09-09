import { openGuide } from '@bedrock-core/guides';
import { openGallery } from '@bedrock-core/generated/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';

/**
 * `source` is typed as always present and is not: a button pushed by redstone,
 * an arrow, or anything that is not an entity delivers the event with none.
 */
const isPlayer = (source: ButtonPushAfterEvent['source'] | undefined): source is Player =>
  source?.typeId === MinecraftEntityTypes.Player;

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
});
