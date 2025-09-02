import { ExtensionConfig } from './config.js';
import { Logger } from './logger.js';
import { JobCardFactory, JobFilter, JobFilterImpl, JobCard } from './job.js';
import { DomManipulator } from './dom.js';
import { MutationObserverManager } from './observers.js';

export class JobFilterService {
  private config: ExtensionConfig;
  private readonly logger: Logger;
  private jobCardFactory: JobCardFactory;
  private readonly jobFilter: JobFilter;
  private readonly domManipulator: DomManipulator;
  private mutationObserverManager: MutationObserverManager;
  private isProcessing = false;
  private isInitialized = false;
  private lastProcessingMs: number = 0;
  private lastHiddenCount: number = 0;
  private lastVisibleCount: number = 0;

  constructor(config: ExtensionConfig) {
    this.config = config;
    this.logger = new Logger(config);
    this.jobCardFactory = new JobCardFactory(config, this.logger);
    this.jobFilter = new JobFilterImpl(this.logger);
    this.domManipulator = new DomManipulator(this.logger);
    this.mutationObserverManager = new MutationObserverManager(
      config,
      this.logger,
      () => this.processJobCards()
    );

    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SETTINGS_UPDATED") {
        this.handleSettingsUpdate(message.data);
        sendResponse({ success: true });
        return true;
      }
      if (message.type === "GET_STATUS") {
        sendResponse({
          filteringEnabled: this.config.filteringEnabled,
          thresholds: { ...this.config.thresholds },
          autoRefresh: { ...this.config.autoRefresh },
          lastProcessingMs: this.lastProcessingMs,
          lastHiddenCount: this.lastHiddenCount,
          lastVisibleCount: this.lastVisibleCount,
          isProcessing: this.isProcessing,
        });
        return true;
      }
      if (message.type === "SHOW_ALL_HIDDEN") {
        this.domManipulator.showAllHiddenElements();
        sendResponse({ success: true });
        return true;
      }
    });
  }

  private handleSettingsUpdate(data: {
    minimumSpent: number;
    proposalsMin: number;
    proposalsMax: number;
    filteringEnabled?: boolean;
    autoRefreshEnabled?: boolean;
    autoRefreshIntervalMs?: number;
  }): void {
    this.logger.info("Received settings update:", data);

    this.config.thresholds.minimumSpent = data.minimumSpent;
    this.config.thresholds.proposalsMin = data.proposalsMin;
    this.config.thresholds.proposalsMax = data.proposalsMax;
    if (typeof data.filteringEnabled === "boolean") {
      this.config.filteringEnabled = data.filteringEnabled;
    }
    if (this.config.autoRefresh) {
      if (typeof data.autoRefreshEnabled === "boolean") {
        this.config.autoRefresh.enabled = data.autoRefreshEnabled;
      }
      if (typeof data.autoRefreshIntervalMs === "number") {
        this.config.autoRefresh.refreshIntervalMs = data.autoRefreshIntervalMs;
      }
    }

    this.jobCardFactory = new JobCardFactory(this.config, this.logger);

    this.mutationObserverManager = new MutationObserverManager(
      this.config,
      this.logger,
      () => this.processJobCards()
    );

    this.domManipulator.showAllHiddenElements();

    this.processJobCards();

    this.logger.info("Settings updated and applied successfully");
  }

  initialize(): void {
    if (this.isInitialized) {
      this.logger.info("Service already initialized, cleaning up first...");
      this.cleanup();
    }

    this.logger.info("Upwork Extension: Initializing content script");

    const jobTileList = this.domManipulator.findJobTileList(
      this.config.selectors.jobTileList
    );

    if (jobTileList) {
      this.setupJobFiltering(jobTileList);
    } else {
      this.waitForJobTileList();
    }

    this.isInitialized = true;
  }

  cleanup(): void {
    this.logger.info("Cleaning up job filter service...");

    this.mutationObserverManager.disconnect();

    this.domManipulator.showAllHiddenElements();

    this.isProcessing = false;
    this.isInitialized = false;

    this.logger.info("Cleanup completed");
  }

  private setupJobFiltering(jobTileList: HTMLElement): void {
    this.logger.info("Found job tile list, starting filter process");

    this.processJobCards(jobTileList);

    this.mutationObserverManager.observeElement(jobTileList, {
      childList: true,
      subtree: true,
    });
  }

  private waitForJobTileList(): void {
    this.logger.info("Job tile list not found, waiting for page to load...");

    const observer = new MutationObserver((_, obs) => {
      const jobTileList = this.domManipulator.findJobTileList(
        this.config.selectors.jobTileList
      );

      if (jobTileList) {
        this.logger.info("Job tile list found after waiting");
        this.setupJobFiltering(jobTileList);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private processJobCards(container?: HTMLElement): void {
    if (this.isProcessing) {
      this.logger.debug("Already processing job cards, skipping...");
      return;
    }
    if (!this.config.filteringEnabled) {
      this.logger.info("Filtering disabled, skipping processing");
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      const targetContainer =
        container ||
        this.domManipulator.findJobTileList(this.config.selectors.jobTileList);

      if (!targetContainer) {
        this.logger.warn("No job tile list container found for processing");
        return;
      }

      const jobCardElements =
        this.domManipulator.getJobCardElements(targetContainer);
      const jobCards = jobCardElements
        .map((element) => this.jobCardFactory.createFromElement(element))
        .filter((jobCard): jobCard is JobCard => jobCard !== null);

      const cardsToHide = jobCards.filter((jobCard) => jobCard.shouldBeHidden);
      const total = jobCards.length;
      const hidden = cardsToHide.length;
      const visible = total - hidden;

      if (cardsToHide.length > 0) {
        this.logger.info(
          `Hiding ${cardsToHide.length} job cards with insufficient spending`
        );
        this.domManipulator.hideElements(
          cardsToHide.map((card) => card.element)
        );
      }

      const processingTime = performance.now() - startTime;
      this.lastProcessingMs = processingTime;
      this.lastHiddenCount = hidden;
      this.lastVisibleCount = visible;
      this.logger.debug(
        `Job card processing completed in ${processingTime.toFixed(
          2
        )}ms (total: ${total}, hidden: ${hidden}, visible: ${visible})`
      );

      if (processingTime > this.config.performance.maxProcessingTime) {
        this.logger.warn(
          `Job card processing took ${processingTime.toFixed(
            2
          )}ms, exceeding threshold`
        );
      }
    } catch (error) {
      this.logger.error("Error processing job cards:", error);
    } finally {
      this.isProcessing = false;
    }
  }
}


