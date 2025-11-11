import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player && block.typeId === MinecraftBlockTypes.StoneButton) {
    render(source, Example, { key: 'example-ui' });
  }
});
