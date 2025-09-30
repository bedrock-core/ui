/**
 * Tiny toggleable console wrapper.
 * Flip LOGS_ENABLED to silence or allow logs.
 * Simplified to string because Minecraft Bedrock Edition console does not support complex objects.
 */

export const LOGS_ENABLED = false;

export const Logger = {
  log(args: string): void {
    if (!LOGS_ENABLED) return;
    console.log(args);
  },
  info(args: string): void {
    if (!LOGS_ENABLED) return;
    console.info(args);
  },
  warn(args: string): void {
    if (!LOGS_ENABLED) return;
    console.warn(args);
  },
  error(args: string): void {
    if (!LOGS_ENABLED) return;
    console.error(args);
  },
  debug(args: string): void {
    if (!LOGS_ENABLED) return;
    console.debug(args);
  },
};

