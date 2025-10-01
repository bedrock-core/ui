import { present } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, ScriptEventCommandMessageAfterEvent, system, world } from '@minecraft/server';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';
import { ModalFormData } from '@minecraft/server-ui';

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player) {
    if (block.typeId === MinecraftBlockTypes.StoneButton) {
      present(source as Player, Example());
    }
    if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
      const form = new ModalFormData();

      form.title('test');
      form.label('test');
      form.show(source as Player);
    }
  }
});

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity }: ScriptEventCommandMessageAfterEvent) => {
  present(sourceEntity as Player, Example());
});
