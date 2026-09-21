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

export type TemplateValueEscaper = (key: string, value: string) => string;

/**
 * Replace template variables in a string in one pass.
 *
 * A function replacement is intentional here: String#replace treats `$&`,
 * `$1`, etc. in a replacement string as special tokens. It also means a
 * placeholder that happens to occur inside user input is never processed a
 * second time.
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>,
  escapeValue: TemplateValueEscaper = (_key, value) => value,
): string {
  return content.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (placeholder, key: string) => {
    const value = variables[key];

    return value === undefined ? placeholder : escapeValue(key, value);
  });
}
