import { randomUUID } from 'node:crypto';

/**
 * Generate a v4 UUID
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Generate all required UUIDs for manifests
 */
export function generateManifestUUIDs(): Record<string, string> {
  return {
    BP_HEADER_UUID: generateUUID(),
    BP_DATA_UUID: generateUUID(),
    BP_SCRIPT_UUID: generateUUID(),
    RP_HEADER_UUID: generateUUID(),
    RP_MODULE_UUID: generateUUID(),
  };
}

/**
 * Replace template variables in a string
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}
