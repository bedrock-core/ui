/**
 * The addon's one i18n instance — typed verbs over packs/data/i18n:
 *
 *   const { t } = i18n.forPlayer(usePlayer());
 *   t($ => $.example.greeting, { name: player.name });
 *
 * Creating it also registers the default translation source, so
 * <Text localizationKey={i18n.key($ => $.example.greeting)} /> measures
 * correctly with no further wiring.
 */
import bundle from '@bedrock-core/generated/i18n';
import { createI18n } from '@bedrock-core/i18n';

export const i18n = createI18n(bundle);
