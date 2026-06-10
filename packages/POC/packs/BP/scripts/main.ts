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
    // Numeric icon strings — the Chest-UI trick. The RP's K-cells bind
    // #form_button_texture from form_buttons and divide to get #item_id_aux,
    // replicating the factory's aux delivery path exactly.
    form.button('Button 1', '65536'); // stone (block raw 1, packed)
    form.button('Button 2', '16842752'); // spear (item raw 257, packed)
    form.button('Button 3', '16842752'); // spear again (item probe duplicate)

    form.show(source);
  }
});
