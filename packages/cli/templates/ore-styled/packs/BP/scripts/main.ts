/**
 * Entry point — the full bedrock-core stack in one file:
 *
 * - `core.register()` brings the addon online: display fields are i18n keys
 *   (other addons render them per player language), the i18n bundle and guide
 *   manifest ride along, and the returned accessors are typed by configDef.
 * - `ui(core)` mounts the shared config UI (config + guides for EVERY
 *   bedrock-core addon in the world) — command registration is first-wins, so
 *   with several addons installed exactly one serves the UI for all of them.
 * - A button push opens this addon's own custom UI (./UI/Example).
 */
import { render } from '@bedrock-core/ui';
import { core } from '@bedrock-core/server';
import { ui } from '@bedrock-core/ui/config';
import bundle from '@bedrock-core/generated/i18n';
import guides from '@bedrock-core/generated/guides';
import { ButtonPushAfterEvent, Entity, Player, world } from '@minecraft/server';
import { MinecraftEntityTypes } from '@minecraft/vanilla-data';
import { configDef } from './config';
import { i18n } from './UI/i18n';
import { Example } from './UI/Example';

const isPlayer = (entity: Entity): entity is Player => entity.typeId === MinecraftEntityTypes.Player;

const config = core.register({
  creator: '{{CREATOR_ID}}',
  pack: '{{PACK_ID}}',
  packName: i18n.key($ => $.meta.name),
  creatorName: i18n.key($ => $.meta.creator),
  version: '1.0.0',
  description: i18n.key($ => $.meta.description),
  translations: bundle,
  guide: guides,
  config: configDef,
});

ui(core);

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

  // Present the Example UI for this player
  render(Example, source);
});
