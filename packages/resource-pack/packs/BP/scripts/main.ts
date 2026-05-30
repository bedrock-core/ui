import { render, Screen } from '@bedrock-core/ui';
import { ButtonPushAfterEvent, Player, world } from '@minecraft/server';
import { MinecraftBlockTypes, MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { App } from './UI/App';
import { showGridTest } from './UI/screens/GridTest';

const isPlayer = (source: ButtonPushAfterEvent['source']): source is Player =>
  source.typeId === MinecraftEntityTypes.Player;

world.afterEvents.buttonPush.subscribe(({ source, block }: ButtonPushAfterEvent): void => {
  if (!isPlayer(source)) {
    return;
  }

  if (block.typeId === MinecraftBlockTypes.StoneButton) {
    // Stone button → main app navigator (Home → all demos with back buttons).
    // Scroll is the baseline; inventory/fixed demos override per-build via useScreenType.
    render(App, source, Screen.Scroll);
  }

  if (block.typeId === MinecraftBlockTypes.CrimsonButton) {
    // Crimson button → grid test (native grid bypass, separate mechanism)
    showGridTest(source);
  }
});
