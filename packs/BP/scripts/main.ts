import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, ScriptEventCommandMessageAfterEvent, system, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player) {
    if (block.typeId === MinecraftBlockTypes.StoneButton) {
      // @ts-expect-error link issues
      render(source as Player, Example());
    }
    if (block.typeId === MinecraftBlockTypes.AcaciaButton) {
      const form = new ActionFormData();

      form.title('test');
      form.label('test');
      // @ts-expect-error link issues
      form.show(source as Player);
    }
  }
});

system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity }: ScriptEventCommandMessageAfterEvent) => {
  // @ts-expect-error link issues
  render(sourceEntity as Player, Example());
});
