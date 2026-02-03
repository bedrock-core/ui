/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sum an array of numbers
 */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Distribute a total value among items based on weights
 */
export function distributeByWeight(total: number, weights: number[]): number[] {
  const totalWeight = sum(weights);

  if (totalWeight === 0) {
    return weights.map(() => 0);
  }

  return weights.map(w => (w / totalWeight) * total);
}
