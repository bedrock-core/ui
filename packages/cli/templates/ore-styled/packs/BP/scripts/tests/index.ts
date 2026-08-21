/**
 * GameTests for this addon.
 *
 * Build and deploy them with `yarn build:test`, then run them in a world with Beta APIs enabled:
 *
 *   /gametest runset example
 *   /gametest run example:the_addon_loads
 *
 * @minecraft/server-gametest is a beta module, so only this build declares it. `yarn build` and
 * `yarn dev` produce a pack with no beta modules at all.
 */
import { register } from '@minecraft/server-gametest';

const SUITE = 'example';

register(SUITE, 'the_addon_loads', (test) => {
  // main.ts has already run by the time a test executes, so getting here at all proves the
  // addon registered without throwing.
  test.succeed();
})
  .maxTicks(20)
  .tag(SUITE);
