import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';

const isPlayer = (source: ButtonPushAfterEvent['source']): source is Player =>
  source.typeId === MinecraftEntityTypes.Player;

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (!isPlayer(source)) {
    return;
  }

  if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
    // Acacia button → vanilla form
    const form = new ActionFormData();

    form.title('Vanilla Form');
    form.button('Button 1');
    form.button('Button 2');
    form.button('Button 3');

    form.show(source);
  }
});
