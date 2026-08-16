/**
 * The addon's one i18n instance, built from the generated bundle — everything
 * (key paths, interpolation variables, plural leaves, the vanilla branch) is
 * inferred from the committed declarations in packs/data/i18n/, no build
 * needed for the IDE to autocomplete.
 *
 * This call is also the measurement wiring: it registers itself as the addon's
 * default translation source, and `localizationKey` text resolves through it
 * automatically — no context, no tables, nothing at the App root.
 */
import bundle from '@bedrock-core/generated/i18n';
import { createI18n } from '@bedrock-core/i18n';

export const i18n = createI18n(bundle);
