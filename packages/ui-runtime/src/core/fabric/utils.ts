import { Fiber, HookSlot } from './types';

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[fiber] ${message} called outside an active fiber`);
  }
}

export function nextHookSlot(fiber: Fiber, tag: HookSlot['tag']): HookSlot {
  const idx: number = fiber.hookIndex++;
  let slot: HookSlot = fiber.hookStates[idx];

  if (!slot) {
    slot = { value: undefined, tag };
    fiber.hookStates[idx] = slot;
  } else if (slot.tag !== tag) {
    // Soft guard to aid debugging when hook order shifts across types
    slot.tag = tag;
  }

  return slot;
}
