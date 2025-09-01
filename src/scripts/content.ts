// Content script for Upwork extension
// This script filters out job cards with $0 spent clients and proposal count filters

// Configuration interface and default config
interface ExtensionConfig {
  readonly selectors: {
    readonly jobTileList: string;
    readonly clientSpending: string;
    readonly proposals: string;
  };
  readonly thresholds: {
    minimumSpent: number; // Made mutable to allow runtime updates
    proposalsMin: number; // Made mutable to allow runtime updates
    proposalsMax: number; // Made mutable to allow runtime updates
  };
  readonly logging: {
    readonly enabled: boolean;
    readonly level: "debug" | "info" | "warn" | "error";
  };
  readonly performance: {
    readonly debounceDelay: number;
    readonly maxProcessingTime: number;
  };
  readonly autoRefresh?: {
    readonly enabled: boolean;
    readonly refreshIntervalMs: number;
  };
}

const DEFAULT_CONFIG: ExtensionConfig = {
  selectors: {
    jobTileList: 'div[data-test="job-tile-list"]',
    clientSpending: 'small[data-test="client-spendings"]',
    proposals: 'strong[data-test="proposals"]',
  },
  thresholds: {
    minimumSpent: 1,
    proposalsMin: 0,
    proposalsMax: 100,
  },
  logging: {
    enabled: true,
    level: "info",
  },
  performance: {
    debounceDelay: 300, // ms
    maxProcessingTime: 5000, // ms
  },
  autoRefresh: {
    enabled: true,
    refreshIntervalMs: 60000, // 60s default
  },
};

const PRODUCTION_CONFIG: ExtensionConfig = {
  ...DEFAULT_CONFIG,
  logging: {
    enabled: true,
    level: "info",
  },
};

const DEVELOPMENT_CONFIG: ExtensionConfig = {
  ...DEFAULT_CONFIG,
  logging: {
    enabled: true,
    level: "debug",
  },
};

// Global config instance that can be updated
let config: ExtensionConfig;

// Track hidden elements so we can restore them when settings change
const hiddenElements = new Set<HTMLElement>();

// Global service instance
let jobFilterService: JobFilterService | null = null;
// Global auto page reloader instance
let autoPageReloader: AutoPageReloader | null = null;

// URL monitoring for SPA navigation
class UrlMonitor {
  private currentUrl: string;
  private readonly logger: Logger;
  private readonly onUrlChange: () => void;

  constructor(logger: Logger, onUrlChange: () => void) {
    this.currentUrl = window.location.href;
    this.logger = logger;
    this.onUrlChange = onUrlChange;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Monitor URL changes using multiple methods for SPA detection
    this.monitorHistoryChanges();
    this.monitorLocationChanges();
    this.monitorPopState();
  }

  private monitorHistoryChanges(): void {
    // Override pushState and replaceState to detect programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.checkUrlChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.checkUrlChange();
    };
  }

  private monitorLocationChanges(): void {
    // Use MutationObserver to watch for URL changes in the address bar
    const observer = new MutationObserver(() => {
      this.checkUrlChange();
    });

    // Watch for changes in the document title as a proxy for navigation
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    // Also watch for specific Upwork navigation patterns
    this.monitorUpworkNavigation();
  }

  private monitorUpworkNavigation(): void {
    // Watch for clicks on navigation elements that might trigger SPA navigation
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");

        if (link && link.href && link.href.includes("/nx/find-work/")) {
          // Debounce the check to allow the navigation to complete
          setTimeout(() => {
            this.checkUrlChange();
          }, 200);
        }
      },
      true
    );

    // Watch for route changes in Upwork's React app
    const routeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // Check if new job tiles are added (indicating navigation)
          const addedNodes = Array.from(mutation.addedNodes);
          const hasJobTiles = addedNodes.some((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              return (
                element.querySelector &&
                element.querySelector('div[data-test="job-tile-list"]')
              );
            }
            return false;
          });

          if (hasJobTiles) {
            setTimeout(() => {
              this.checkUrlChange();
            }, 100);
          }
        }
      }
    });

    routeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private monitorPopState(): void {
    // Listen for browser back/forward navigation
    window.addEventListener("popstate", () => {
      this.checkUrlChange();
    });
  }

  private checkUrlChange(): void {
    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      this.logger.info(`URL changed from ${this.currentUrl} to ${newUrl}`);
      this.currentUrl = newUrl;

      // Debounce the URL change to avoid multiple rapid calls
      setTimeout(() => {
        this.onUrlChange();
      }, 100);
    }
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }
}

// Helper function to get configuration based on environment
function getConfig(): ExtensionConfig {
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("dev");
  console.log("isDevelopment", isDevelopment);
  return isDevelopment ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;
}

// Function to load settings from storage
async function loadSettingsFromStorage(): Promise<{
  minimumSpent: number;
  proposalsMin: number;
  proposalsMax: number;
}> {
  try {
    const result = await chrome.storage.sync.get([
      "minimumSpent",
      "proposalsMin",
      "proposalsMax",
    ]);
    return {
      minimumSpent: result.minimumSpent || 1, // Default to 1 if not set
      proposalsMin: result.proposalsMin || 0, // Default to 0
      proposalsMax: result.proposalsMax || 100, // Default to 100
    };
  } catch (error) {
    console.error("Error loading settings from storage:", error);
    return { minimumSpent: 1, proposalsMin: 0, proposalsMax: 100 }; // Fallback to defaults
  }
}

// Function to update config with new settings
async function updateConfigWithSettings(): Promise<void> {
  const settings = await loadSettingsFromStorage();
  config.thresholds.minimumSpent = settings.minimumSpent;
  config.thresholds.proposalsMin = settings.proposalsMin;
  config.thresholds.proposalsMax = settings.proposalsMax;
  console.log("Updated config with settings:", settings);
}

// Logger class following Single Responsibility Principle
class Logger {
  private readonly config: ExtensionConfig;

  constructor(config: ExtensionConfig) {
    this.config = config;
  }

  private shouldLog(level: string): boolean {
    if (!this.config.logging.enabled) return false;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
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

// Amount parser class following Single Responsibility Principle
class AmountParser {
  private static readonly MULTIPLIERS = {
    k: 1000,
    m: 1000000,
    b: 1000000000,
  } as const;

  private static readonly CLEANUP_PATTERNS = [
    { pattern: /\$/g, replacement: "" },
    { pattern: /\+/g, replacement: "" },
    { pattern: /\bspent\b/gi, replacement: "" },
  ];

  /**
   * Parses a spending amount string into a numeric value
   * @param amount - The amount string (e.g., "$10k+ spent", "$5m+ spent")
   * @returns The numeric value in dollars
   */
  static parse(amount: string): number {
    try {
      let cleanedAmount = amount.trim().toLowerCase();

      // Apply cleanup patterns
      this.CLEANUP_PATTERNS.forEach(({ pattern, replacement }) => {
        cleanedAmount = cleanedAmount.replace(pattern, replacement);
      });

      cleanedAmount = cleanedAmount.trim();

      if (!cleanedAmount) {
        return 0;
      }

      const lastChar = cleanedAmount.slice(-1);
      const multiplier =
        this.MULTIPLIERS[lastChar as keyof typeof this.MULTIPLIERS];

      if (multiplier) {
        const numericPart = cleanedAmount.slice(0, -1);
        const value = parseFloat(numericPart);
        return isNaN(value) ? 0 : value * multiplier;
      }

      const value = parseFloat(cleanedAmount);
      return isNaN(value) ? 0 : value;
    } catch (error) {
      console.error("Error parsing amount:", error);
      return 0;
    }
  }
}

// Proposals parser class following Single Responsibility Principle
class ProposalsParser {
  /**
   * Parses a proposals count string into a numeric value
   * @param proposals - The proposals string (e.g., "20 to 50", "10 to 15", "Less than 5")
   * @returns The numeric value representing the maximum proposals count
   */
  static parse(proposals: string): number {
    try {
      const cleanedProposals = proposals.trim().toLowerCase();

      // Handle "Less than X" format
      if (cleanedProposals.startsWith("less than")) {
        const match = cleanedProposals.match(/less than (\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          return value > 0 ? value - 1 : 0; // Return the number before "less than"
        }
      }

      // Handle "X to Y" format
      const rangeMatch = cleanedProposals.match(/(\d+)\s+to\s+(\d+)/);
      if (rangeMatch) {
        const max = parseInt(rangeMatch[2]);
        return max; // Return the maximum value in the range
      }

      // Handle "X+" format (more than X)
      const moreThanMatch = cleanedProposals.match(/(\d+)\+/);
      if (moreThanMatch) {
        const value = parseInt(moreThanMatch[1]);
        return value + 10; // Return a reasonable upper bound
      }

      // Handle single number
      const singleMatch = cleanedProposals.match(/(\d+)/);
      if (singleMatch) {
        return parseInt(singleMatch[1]);
      }

      return 0; // Default to 0 if no pattern matches
    } catch (error) {
      console.error("Error parsing proposals:", error);
      return 0;
    }
  }
}

// Job card interface
interface JobCard {
  readonly element: HTMLElement;
  readonly spendingAmount: number;
  readonly proposalsCount: number;
  readonly shouldBeHidden: boolean;
}

// Job card factory following Factory Pattern
class JobCardFactory {
  private readonly config: ExtensionConfig;
  private readonly logger: Logger;

  constructor(config: ExtensionConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  createFromElement(element: HTMLElement): JobCard | null {
    try {
      const spendingElement = element.querySelector(
        this.config.selectors.clientSpending
      ) as HTMLElement | null;

      const proposalsElement = element.querySelector(
        this.config.selectors.proposals
      ) as HTMLElement | null;

      if (!spendingElement) {
        this.logger.debug("No spending element found in job card");
        return null;
      }

      const spendingText = this.extractSpendingText(spendingElement);
      const spendingAmount = AmountParser.parse(spendingText);

      let proposalsCount = 0;
      if (proposalsElement) {
        const proposalsText = this.extractProposalsText(proposalsElement);
        proposalsCount = ProposalsParser.parse(proposalsText);
      }

      const shouldBeHidden = this.shouldHideJob(spendingAmount, proposalsCount);

      return {
        element,
        spendingAmount,
        proposalsCount,
        shouldBeHidden,
      };
    } catch (error) {
      this.logger.error("Error creating job card from element:", error);
      return null;
    }
  }

  private extractSpendingText(element: HTMLElement): string {
    return (element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private extractProposalsText(element: HTMLElement): string {
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  }

  private shouldHideJob(
    spendingAmount: number,
    proposalsCount: number
  ): boolean {
    this.logger.debug(
      `Spending amount: $${spendingAmount}, Proposals count: ${proposalsCount}`
    );
    // Hide if spending is below threshold
    if (spendingAmount < this.config.thresholds.minimumSpent) {
      this.logger.debug(
        `Job should be hidden due to low spending: $${spendingAmount} < $${this.config.thresholds.minimumSpent}`
      );
      return true;
    }

    // Hide if proposals count is outside the range
    // Only apply filter if it's not the default "show all" range (0-100)
    if (
      this.config.thresholds.proposalsMin !== 0 ||
      this.config.thresholds.proposalsMax !== 100
    ) {
      if (
        proposalsCount < this.config.thresholds.proposalsMin ||
        proposalsCount > this.config.thresholds.proposalsMax
      ) {
        this.logger.debug(
          `Job should be hidden due to proposals count: ${proposalsCount} not in range [${this.config.thresholds.proposalsMin}, ${this.config.thresholds.proposalsMax}]`
        );
        return true;
      }
    }

    return false;
  }
}

// Job filter interface following Interface Segregation Principle
interface JobFilter {
  filter(jobCards: JobCard[]): JobCard[];
}

// Job filter implementation
class JobFilterImpl implements JobFilter {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  filter(jobCards: JobCard[]): JobCard[] {
    return jobCards.filter((jobCard) => {
      if (jobCard.shouldBeHidden) {
        this.logger.info(
          `Filtering out job card with $${jobCard.spendingAmount} spent and ${jobCard.proposalsCount} proposals`
        );
        return false;
      }
      return true;
    });
  }
}

// DOM manipulator class following Single Responsibility Principle
class DomManipulator {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  hideElements(elements: HTMLElement[]): void {
    elements.forEach((element) => {
      try {
        // Hide the element instead of removing it
        element.style.display = "none";
        // Add a data attribute to mark it as hidden by our extension
        element.setAttribute("data-upwork-extension-hidden", "true");
        // Track the hidden element
        hiddenElements.add(element);
        this.logger.debug("Successfully hidden job card element");
      } catch (error) {
        this.logger.error("Error hiding job card element:", error);
      }
    });
  }

  showElements(elements: HTMLElement[]): void {
    elements.forEach((element) => {
      try {
        // Show the element
        element.style.display = "";
        // Remove the data attribute
        element.removeAttribute("data-upwork-extension-hidden");
        // Remove from tracking set
        hiddenElements.delete(element);
        this.logger.debug("Successfully shown job card element");
      } catch (error) {
        this.logger.error("Error showing job card element:", error);
      }
    });
  }

  // Show all previously hidden elements
  showAllHiddenElements(): void {
    const elementsToShow = Array.from(hiddenElements);
    this.showElements(elementsToShow);
    this.logger.info(
      `Restored ${elementsToShow.length} previously hidden elements`
    );
  }

  findJobTileList(selector: string): HTMLElement | null {
    try {
      return document.querySelector(selector);
    } catch (error) {
      this.logger.error("Error finding job tile list:", error);
      return null;
    }
  }

  getJobCardElements(container: HTMLElement): HTMLElement[] {
    try {
      return Array.from(container.children) as HTMLElement[];
    } catch (error) {
      this.logger.error("Error getting job card elements:", error);
      return [];
    }
  }
}

// Performance utility for debouncing
class Debouncer {
  private timeoutId: number | null = null;

  debounce(func: () => void, delay: number): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      func();
      this.timeoutId = null;
    }, delay);
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// Auto page reloader to force-refresh listing page
class AutoPageReloader {
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
        this.logger.info(
          "AutoPageReloader: reloading page to fetch newer jobs"
        );
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

// Mutation observer manager following Single Responsibility Principle
class MutationObserverManager {
  private readonly config: ExtensionConfig;
  private readonly logger: Logger;
  private readonly onMutation: () => void;
  private readonly debouncer: Debouncer;
  private observer: MutationObserver | null = null;

  constructor(config: ExtensionConfig, logger: Logger, onMutation: () => void) {
    this.config = config;
    this.logger = logger;
    this.onMutation = onMutation;
    this.debouncer = new Debouncer();
  }

  observeElement(element: HTMLElement, options: MutationObserverInit): void {
    try {
      this.observer = new MutationObserver((mutations: MutationRecord[]) => {
        this.logger.debug(`Detected ${mutations.length} mutations`);

        // Debounce the processing to avoid excessive calls
        this.debouncer.debounce(() => {
          this.onMutation();
        }, this.config.performance.debounceDelay);
      });

      this.observer.observe(element, options);
      this.logger.info("Mutation observer set up successfully");
    } catch (error) {
      this.logger.error("Error setting up mutation observer:", error);
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.logger.debug("Mutation observer disconnected");
    }
    this.debouncer.cancel();
  }
}

// Main job filter service following Single Responsibility Principle
class JobFilterService {
  private config: ExtensionConfig; // Made mutable to allow runtime updates
  private readonly logger: Logger;
  private jobCardFactory: JobCardFactory;
  private readonly jobFilter: JobFilter;
  private readonly domManipulator: DomManipulator;
  private mutationObserverManager: MutationObserverManager;
  private isProcessing = false;
  private isInitialized = false;

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

    // Set up message listener for settings updates
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SETTINGS_UPDATED") {
        this.handleSettingsUpdate(message.data);
        sendResponse({ success: true });
      }
    });
  }

  private handleSettingsUpdate(data: {
    minimumSpent: number;
    proposalsMin: number;
    proposalsMax: number;
  }): void {
    this.logger.info("Received settings update:", data);

    // Update config
    this.config.thresholds.minimumSpent = data.minimumSpent;
    this.config.thresholds.proposalsMin = data.proposalsMin;
    this.config.thresholds.proposalsMax = data.proposalsMax;

    // Recreate job card factory with updated config
    this.jobCardFactory = new JobCardFactory(this.config, this.logger);

    // Recreate mutation observer manager with updated config
    this.mutationObserverManager = new MutationObserverManager(
      this.config,
      this.logger,
      () => this.processJobCards()
    );

    // Show all previously hidden elements first
    this.domManipulator.showAllHiddenElements();

    // Reprocess job cards with new settings
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

    // Disconnect mutation observer
    this.mutationObserverManager.disconnect();

    // Show all hidden elements
    this.domManipulator.showAllHiddenElements();

    // Reset processing flag
    this.isProcessing = false;
    this.isInitialized = false;

    this.logger.info("Cleanup completed");
  }

  private setupJobFiltering(jobTileList: HTMLElement): void {
    this.logger.info("Found job tile list, starting filter process");

    // Process existing job cards
    this.processJobCards(jobTileList);

    // Set up observer for dynamic content
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

      if (cardsToHide.length > 0) {
        this.logger.info(
          `Hiding ${cardsToHide.length} job cards with insufficient spending`
        );
        this.domManipulator.hideElements(
          cardsToHide.map((card) => card.element)
        );
      }

      const processingTime = performance.now() - startTime;
      this.logger.debug(
        `Job card processing completed in ${processingTime.toFixed(2)}ms`
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

console.log("Setting up extension");

// Main execution
async function initializeExtension() {
  config = getConfig();

  // Load settings from storage and update config
  await updateConfigWithSettings();

  // Create the job filter service
  jobFilterService = new JobFilterService(config);

  // Create logger for URL monitoring
  const logger = new Logger(config);

  // Prepare auto page reloader and start only on listing page
  autoPageReloader = new AutoPageReloader(config, logger);
  if (window.location.href.includes("/nx/find-work/")) {
    autoPageReloader.start();
  }

  // Create URL monitor to handle SPA navigation
  const urlMonitor = new UrlMonitor(logger, () => {
    logger.info("URL change detected, reinitializing extension...");

    // Check if we're on a job listing page
    const currentUrl = urlMonitor.getCurrentUrl();
    if (currentUrl.includes("/nx/find-work/")) {
      logger.info("On job listing page, reinitializing...");

      // Reinitialize the service
      if (jobFilterService) {
        jobFilterService.initialize();
      }
      if (autoPageReloader) {
        autoPageReloader.start();
      }
    } else {
      logger.info("Not on job listing page, skipping reinitialization");
      if (autoPageReloader) {
        autoPageReloader.stop();
      }
    }
  });

  // Initialize the service
  jobFilterService.initialize();
}

// Initialize the extension
initializeExtension().catch(error => {
  console.error('Error initializing extension:', error);
});



