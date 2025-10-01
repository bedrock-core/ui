import { IntrinsicElementFunction } from '../types/component';

/**
 * Intrinsic element registry - maps string names to native element functions
 * This will be populated with actual native components (Panel, Text, Image, etc.)
 */
const intrinsicElements = new Map<string, IntrinsicElementFunction>();

/**
 * Get an intrinsic element by name
 */
export function getIntrinsicComponent(name: string): IntrinsicElementFunction | undefined {
  return intrinsicElements.get(name.toLowerCase());
}

/**
 * Register an intrinsic element (native component)
 */
export function registerIntrinsicComponent(name: string, component: IntrinsicElementFunction): void {
  intrinsicElements.set(name.toLowerCase(), component);
}
