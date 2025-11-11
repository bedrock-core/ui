import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Entity, Player, world } from '@minecraft/server';
import { MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';

const isPlayer = (entity: Entity): entity is Player => entity.typeId === MinecraftEntityTypes.Player;

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (!isPlayer(source)) {
    return;
  }

  // Present the Example UI for this player
  render(Example, source);
});
