import { ExtensionConfig } from './config.js';
import { Logger } from './logger.js';
import { AmountParser, ProposalsParser } from './parsers.js';

export interface JobCard {
  readonly element: HTMLElement;
  readonly spendingAmount: number;
  readonly proposalsCount: number;
  readonly shouldBeHidden: boolean;
}

export class JobCardFactory {
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

      return { element, spendingAmount, proposalsCount, shouldBeHidden };
    } catch (error) {
      this.logger.error("Error creating job card from element:", error);
      return null;
    }
  }

  private extractSpendingText(element: HTMLElement): string {
    return (element.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  private extractProposalsText(element: HTMLElement): string {
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  }

  private shouldHideJob(spendingAmount: number, proposalsCount: number): boolean {
    this.logger.debug(
      `Spending amount: $${spendingAmount}, Proposals count: ${proposalsCount}`
    );
    if (spendingAmount < this.config.thresholds.minimumSpent) {
      this.logger.debug(
        `Job should be hidden due to low spending: $${spendingAmount} < $${this.config.thresholds.minimumSpent}`
      );
      return true;
    }

    if (this.config.thresholds.proposalsMin !== 0 || this.config.thresholds.proposalsMax !== 100) {
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

export interface JobFilter {
  filter(jobCards: JobCard[]): JobCard[];
}

export class JobFilterImpl implements JobFilter {
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


