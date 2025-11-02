import { Dispatcher, Fiber, FiberContext } from './types';

export const FiberRegistry = new Map<string, Fiber>();

let currentFiber: Fiber | undefined = undefined;
let currentDispatcher: Dispatcher | undefined = undefined;

export function setCurrentFiber(fiber: Fiber | undefined, dispatcher: Dispatcher | undefined): void {
  currentFiber = fiber;
  currentDispatcher = dispatcher;
}

export function getCurrentFiber(): [Fiber | undefined, Dispatcher | undefined] {
  return [currentFiber, currentDispatcher];
}

const ContextRegistry = new Map<symbol, unknown>();

export function createFiberContext<T>(defaultValue: T): FiberContext<T> {
  return { id: Symbol('ctx'), defaultValue };
}

export function setFiberContextValue<T>(ctx: FiberContext<T>, value: T): void {
  ContextRegistry.set(ctx.id, value);
}

export function getFiberContextValue<T>(ctx: FiberContext<T>): T {
  if (ContextRegistry.has(ctx.id)) {
    return ContextRegistry.get(ctx.id) as T;
  }

  return ctx.defaultValue;
}
