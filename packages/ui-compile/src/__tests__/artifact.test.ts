import { describe, expect, it } from 'vitest';
import { emit } from '../emit';
import { demoScreen } from '../__fixtures__/demo';

/**
 * The demo screen's JSON UI used to be written from here, because nothing else
 * could produce it. The `ui-compile` regolith filter does that now, from a real
 * `demo.screen.tsx`, so this file no longer owns the pack's contents — it just
 * checks the two things the router depends on and would fail silently on.
 */
describe('the reference screen', () => {
  const document = emit(demoScreen);

  it('is addressable by the chest_screen router', () => {
    // The router references `@bcui_demo.screen`. If either half moves, the
    // container renders empty with nothing in the log to explain why.
    expect(document.namespace).toBe('bcui_demo');
    expect(document[demoScreen.entry]).toBeDefined();
  });

  it('round-trips through JSON unchanged', () => {
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });
});
