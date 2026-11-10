import { Dispatcher, Fiber } from './types';

let currentFiber: Fiber | undefined = undefined;
let currentDispatcher: Dispatcher | undefined = undefined;

export function setCurrentFiber(fiber: Fiber | undefined, dispatcher: Dispatcher | undefined): void {
  currentFiber = fiber;
  currentDispatcher = dispatcher;
}

export function getCurrentFiber(): [Fiber | undefined, Dispatcher | undefined] {
  return [currentFiber, currentDispatcher];
}
