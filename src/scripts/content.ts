// Bootstrap-only content script. Logic moved into modules.
import {
  ExtensionConfig,
  getConfig,
  updateConfigWithSettings,
} from "./config.js";
import { Logger } from "./logger.js";
import { JobFilterService } from "./service.js";
import { AutoPageReloader } from "./reloader.js";
import { UrlMonitor } from "./observers.js";

let config: ExtensionConfig;
let jobFilterService: JobFilterService | null = null;
let autoPageReloader: AutoPageReloader | null = null;

console.log("Setting up extension");

async function initializeExtension() {
  config = getConfig();
  await updateConfigWithSettings(config);

  jobFilterService = new JobFilterService(config);

  const logger = new Logger(config);
  autoPageReloader = new AutoPageReloader(config, logger);
  if (window.location.href.includes("/nx/find-work/")) {
    autoPageReloader.start();
  }

  const urlMonitor = new UrlMonitor(logger, () => {
    logger.info("URL change detected, reinitializing extension...");
    const currentUrl = urlMonitor.getCurrentUrl();
    if (currentUrl.includes("/nx/find-work/")) {
      logger.info("On job listing page, reinitializing...");
      if (jobFilterService) jobFilterService.initialize();
      if (autoPageReloader) autoPageReloader.start();
    } else {
      logger.info("Not on job listing page, skipping reinitialization");
      if (autoPageReloader) autoPageReloader.stop();
    }
  });

  jobFilterService.initialize();
}

initializeExtension().catch((error) => {
  console.error("Error initializing extension:", error);
});
