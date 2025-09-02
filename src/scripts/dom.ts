import { Logger } from './logger.js';

const hiddenElements = new Set<HTMLElement>();

export class DomManipulator {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  hideElements(elements: HTMLElement[]): void {
    elements.forEach((element) => {
      try {
        element.style.display = "none";
        element.setAttribute("data-upwork-extension-hidden", "true");
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
        element.style.display = "";
        element.removeAttribute("data-upwork-extension-hidden");
        hiddenElements.delete(element);
        this.logger.debug("Successfully shown job card element");
      } catch (error) {
        this.logger.error("Error showing job card element:", error);
      }
    });
  }

  showAllHiddenElements(): void {
    const elementsToShow = Array.from(hiddenElements);
    this.showElements(elementsToShow);
    this.logger.info(`Restored ${elementsToShow.length} previously hidden elements`);
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


