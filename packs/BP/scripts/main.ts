import { present } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { ExampleComponent } from './UI/Example';

world.afterEvents.buttonPush.subscribe(({ source }: ButtonPushAfterEvent): void => {
  if (source.typeId === MinecraftEntityTypes.Player) {
    // @ts-expect-error nested linked repo issue
    present(source as Player, ExampleComponent());
  }
});

