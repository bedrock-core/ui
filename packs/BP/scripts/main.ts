import { present } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { ExampleComponent } from './UI/Example';
import { ModalFormData } from '@minecraft/server-ui';

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player) {
    if (block.typeId === MinecraftBlockTypes.StoneButton) {
      // @ts-expect-error nested linked repo issue
      present(source as Player, ExampleComponent());
    }
    if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
      const form = new ModalFormData();

      form.title('test');
      form.label('test');

      // @ts-expect-error nested linked repo issue
      form.show(source as Player);
    }
  }
});

