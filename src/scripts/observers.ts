import { ExtensionConfig } from './config.js';
import { Logger } from './logger.js';
import { Debouncer } from './performance.js';

export class MutationObserverManager {
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

export class UrlMonitor {
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
    this.monitorHistoryChanges();
    this.monitorLocationChanges();
    this.monitorPopState();
  }

  private monitorHistoryChanges(): void {
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
    const observer = new MutationObserver(() => {
      this.checkUrlChange();
    });

    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    this.monitorUpworkNavigation();
  }

  private monitorUpworkNavigation(): void {
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");

        if (link && link.href && link.href.includes("/nx/find-work/")) {
          setTimeout(() => {
            this.checkUrlChange();
          }, 200);
        }
      },
      true
    );

    const routeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
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
    window.addEventListener("popstate", () => {
      this.checkUrlChange();
    });
  }

  private checkUrlChange(): void {
    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      this.logger.info(`URL changed from ${this.currentUrl} to ${newUrl}`);
      this.currentUrl = newUrl;
      setTimeout(() => {
        this.onUrlChange();
      }, 100);
    }
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }
}


