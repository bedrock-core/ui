import { render } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { Example } from './UI/Example';
import { FlexTest } from './UI/FlexTest';
import { FontMetricsTest } from './UI/FontMetricsTest';
import { OreStyledTest } from './UI/OreStyledTest';

const isPlayer = (source: ButtonPushAfterEvent['source']): source is Player => source.typeId === MinecraftEntityTypes.Player;

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

    if (block.typeId === MinecraftBlockTypes.BirchButton) {
      // Birch button → flex test fixture (visual flex behavior verification).
      render(FlexTest, source);
    }

    if (block.typeId === MinecraftBlockTypes.WoodenButton) {
      // Oak button → font metrics test (bold/italic/format variant comparison).
      render(FontMetricsTest, source);
    }

    if (block.typeId === MinecraftBlockTypes.JungleButton) {
      // Jungle button → ore-styled component showcase.
      render(OreStyledTest, source);
    }
  }
});
