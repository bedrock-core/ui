import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Entity, Player, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';

const isPlayer = (source: Entity): source is Player => source.typeId === MinecraftEntityTypes.Player;

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (isPlayer(source)) {
    if (block.typeId === MinecraftBlockTypes.StoneButton) {
      render(Example, source);
    }

    if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
      const form = new ActionFormData();

      form.title('test');
      form.label('test');
      form.show(source);
    }
  }
});
