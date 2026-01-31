/**
 * Percentage conversion utilities for handling dimension and position values.
 *
 * Format: "${number}%" (e.g., "50.25%", "100%")
 * - Values are floored to 2 decimal places during creation
 * - Before serialization, decimals are removed by multiplying by 100 (50.25 → 5025)
 * - Parent containers scaled to 100% to accommodate 100x values
 */

import type { Percent } from '../components/control';

/**
 * Convert percentage string to number (functional, pure).
 *
 * @param value - Percentage string in format "${number}%" (e.g., "50.25%")
 * @returns Number value (e.g., 50.25)
 *
 * @example
 * toNumber("50.25%") // 50.25
 * toNumber("100%")   // 100
 * toNumber("0%")     // 0
 */
export function toNumber(value: Percent): number {
  const numStr = value.slice(0, -1); // Remove '%' suffix

  return Number.parseFloat(numStr);
}

/**
 * Convert number to percentage string, floored to 2 decimal places (functional, pure).
 *
 * @param value - Number value (e.g., 50.25678)
 * @returns Percentage string (e.g., "50.25%")
 *
 * @example
 * toPercent(50.25678) // "50.25%"
 * toPercent(100)      // "100%"
 * toPercent(0.1234)   // "0.12%"
 */
export function toPercent(value: number): Percent {
  const floored = Math.floor(value * 100) / 100; // Floor to 2 decimals

  return `${floored}%`;
}

/**
 * Scale percentage value for serialization (multiply by 100 to remove decimals).
 * JSON UI ignores numbers with non-digit characters (like decimal points),
 * so we convert 50.25 → 5025.
 *
 * @param value - Percentage string (e.g., "50.25%")
 * @returns Scaled integer (e.g., 5025)
 *
 * @example
 * scaleForSerialization("50.25%") // 5025
 * scaleForSerialization("100%")   // 10000
 * scaleForSerialization("0.12%")  // 12
 */
export function scaleForSerialization(value: Percent): number {
  const num = toNumber(value);

  return Math.floor(num * 100); // Multiply by 100 and ensure integer
}
