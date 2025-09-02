import { ExtensionConfig } from './config.js';
import { Logger } from './logger.js';

export class AutoPageReloader {
  private readonly config: ExtensionConfig;
  private readonly logger: Logger;
  private intervalId: number | null = null;

  constructor(config: ExtensionConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  start(): void {
    if (!this.config.autoRefresh?.enabled) {
      this.logger.info("AutoRefresh disabled in config");
      return;
    }
    this.stop();
    const interval = this.config.autoRefresh.refreshIntervalMs;
    this.logger.info(`Starting AutoPageReloader (every ${interval}ms)`);
    this.intervalId = window.setInterval(() => {
      try {
        this.logger.info("AutoPageReloader: reloading page to fetch newer jobs");
        window.location.reload();
      } catch (error) {
        this.logger.error("Error during auto page reload", error);
      }
    }, interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}


