// Logger class following Single Responsibility Principle
import { ExtensionConfig } from './config.js';

export class Logger {
  private readonly config: ExtensionConfig;

  constructor(config: ExtensionConfig) {
    this.config = config;
  }

  private shouldLog(level: string): boolean {
    if (!this.config.logging.enabled) return false;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;
    return (
      levels[level as keyof typeof levels] >= levels[this.config.logging.level]
    );
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}


