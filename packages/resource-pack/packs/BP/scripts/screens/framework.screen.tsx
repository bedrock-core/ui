/** @jsxImportSource @bedrock-core/ui */
import { AddonPage } from '@bedrock-core/config/compiled';
import { i18n } from '@bedrock-core/config/i18n/index';
import type { JSX } from '@bedrock-core/ui';
import manifest from '../../../RP/manifest.json';

/**
 * The framework's own page in the addon list.
 *
 * Nothing registers the framework, so no addon's pack can carry its page;
 * this one is baked into the render pack, and the host shows it from the
 * reference the library build emits beside it. The version is the pack's:
 * the pack is what draws it.
 */
const { key } = i18n;

const [major, minor, patch] = manifest.header.version;

export default function FrameworkPage(): JSX.Element {
  return (
    <AddonPage
      addon={{
        packName: key($ => $.framework.name),
        version: `${String(major)}.${String(minor)}.${String(patch)}`,
        creator: key($ => $.framework.creator),
        description: key($ => $.framework.description),
        icon: 'textures/ui/bedrock_core/icon',
      }}
    />
  );
}
