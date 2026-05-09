import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';
import { FlexTest } from './UI/FlexTest';

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player) {
    if (block.typeId === MinecraftBlockTypes.StoneButton) {
      render(Example, source as Player);
    }
    if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
      const form = new ActionFormData();

      form.title('test');
      form.label('test');
      form.show(source as Player);
    }
    if (block.typeId === MinecraftBlockTypes.BirchButton) {
      // Birch button → flex test fixture (visual flex behavior verification).
      render(FlexTest, source as Player);
    }
  }
});
