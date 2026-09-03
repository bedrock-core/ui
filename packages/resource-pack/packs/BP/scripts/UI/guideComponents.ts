import type { GuideComponents } from '@bedrock-core/guides';
import { GuideDemoButton } from './components/GuideDemoButton';

/**
 * The `cmp` blocks this addon's guide pages may use. One registry for both
 * ways a page is rendered: `createGuide` takes it at runtime, and the guides
 * filter's generated screen modules import it so the compiled pages bake the
 * same components (config.json names this module).
 */
const guideComponents: GuideComponents = { GuideDemoButton };

export default guideComponents;
