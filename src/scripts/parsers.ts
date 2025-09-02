// Amount parser
export class AmountParser {
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

  static parse(amount: string): number {
    try {
      let cleanedAmount = amount.trim().toLowerCase();

      this.CLEANUP_PATTERNS.forEach(({ pattern, replacement }) => {
        cleanedAmount = cleanedAmount.replace(pattern, replacement);
      });

      cleanedAmount = cleanedAmount.trim();

      if (!cleanedAmount) {
        return 0;
      }

      const lastChar = cleanedAmount.slice(-1);
      const multiplier = this.MULTIPLIERS[lastChar as keyof typeof this.MULTIPLIERS];

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

// Proposals parser
export class ProposalsParser {
  static parse(proposals: string): number {
    try {
      const cleanedProposals = proposals.trim().toLowerCase();

      if (cleanedProposals.startsWith("less than")) {
        const match = cleanedProposals.match(/less than (\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          return value > 0 ? value - 1 : 0;
        }
      }

      const rangeMatch = cleanedProposals.match(/(\d+)\s+to\s+(\d+)/);
      if (rangeMatch) {
        const max = parseInt(rangeMatch[2]);
        return max;
      }

      const moreThanMatch = cleanedProposals.match(/(\d+)\+/);
      if (moreThanMatch) {
        const value = parseInt(moreThanMatch[1]);
        // Treat X+ as upper bound (cap at 100)
        return Math.min(100, value >= 50 ? 100 : value + 10);
      }

      const singleMatch = cleanedProposals.match(/(\d+)/);
      if (singleMatch) {
        return parseInt(singleMatch[1]);
      }

      return 0;
    } catch (error) {
      console.error("Error parsing proposals:", error);
      return 0;
    }
  }
}


