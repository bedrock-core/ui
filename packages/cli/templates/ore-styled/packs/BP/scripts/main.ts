/**
 * Entry point — the full bedrock-core stack in one file:
 *
 * - `core.register()` brings the addon online and installs everything the addon
 *   declares. Display fields are i18n keys, so other addons render them per
 *   player language, and each field hands back an accessor typed by what it
 *   was given.
 * - `catalog`, `config` and `guides` are the bedrock-core apps: each registers
 *   its own command under this addon's namespace and serves its own screens.
 * - A button push opens this addon's own custom UI (./UI/screens/home.screen).
 */
import { render } from '@bedrock-core/ui';
import { core } from '@bedrock-core/server';
import { registerCatalog } from '@bedrock-core/catalog';
import { registerConfig } from '@bedrock-core/config';
import { registerGuides } from '@bedrock-core/guides';
import { ButtonPushAfterEvent, Entity, Player, world } from '@minecraft/server';
import { MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { configDef } from './config';
import { i18n } from './UI/i18n';
import Home from './UI/screens/home.screen';

const isPlayer = (entity: Entity): entity is Player => entity.typeId === MinecraftEntityTypes.Player;

const { config } = core.register({
  manifest: {
    creator: '{{CREATOR_ID}}',
    pack: '{{PACK_ID}}',
    packName: i18n.key($ => $.meta.name),
    creatorName: i18n.key($ => $.meta.creator),
    version: '1.0.0',
    description: i18n.key($ => $.meta.description),
  },
  catalog: registerCatalog(),
  config: registerConfig(configDef),
  guides: registerGuides(),
});

// Server-resolved text: t() returns the filled string in this player's
// language (locale chain: per-player override → client locale → default).
world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn || !config.server.get().general.greetingEnabled) {
    return;
  }

  const { t } = i18n.forPlayer(player);

  player.sendMessage(t($ => $.example.greeting, { name: player.name }));
});

world.afterEvents.buttonPush.subscribe(({ source }: ButtonPushAfterEvent): void => {
  if (!isPlayer(source)) {
    return;
  }

  // Present the Home screen for this player
  render(Home, source);
});
