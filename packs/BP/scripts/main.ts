import { present } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';

world.afterEvents.buttonPush.subscribe(({ source }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player) {
    const player = source as Player;

    const form = new ModalFormData();

    present(form, player, Example());
  }
});

