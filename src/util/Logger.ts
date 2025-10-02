export class Logger {
  static enabled: boolean = false;

  static configure(enabled: boolean): void {
    Logger.enabled = enabled;
  }

  static log(args: string): void {
    if (!Logger.enabled) return;
    console.log(args);
  }

  static info(args: string): void {
    if (!Logger.enabled) return;
    console.info(args);
  }

  static warn(args: string): void {
    if (!Logger.enabled) return;
    console.warn(args);
  }

  static error(args: string): void {
    if (!Logger.enabled) return;
    console.error(args);
  }

  static debug(args: string): void {
    if (!Logger.enabled) return;
    console.debug(args);
  }
}
