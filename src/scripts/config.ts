// Configuration interface and defaults
export interface ExtensionConfig {
  readonly selectors: {
    readonly jobTileList: string;
    readonly clientSpending: string;
    readonly proposals: string;
  };
  readonly thresholds: {
    minimumSpent: number;
    proposalsMin: number;
    proposalsMax: number;
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
    debounceDelay: 300,
    maxProcessingTime: 5000,
  },
  autoRefresh: {
    enabled: true,
    refreshIntervalMs: 60000,
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

export function getConfig(): ExtensionConfig {
  const isDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname.includes("dev");
  console.log("isDevelopment", isDevelopment);
  return isDevelopment ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;
}

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
      minimumSpent: result.minimumSpent || 1,
      proposalsMin: result.proposalsMin || 0,
      proposalsMax: result.proposalsMax || 100,
    };
  } catch (error) {
    console.error("Error loading settings from storage:", error);
    return { minimumSpent: 1, proposalsMin: 0, proposalsMax: 100 };
  }
}

export async function updateConfigWithSettings(config: ExtensionConfig): Promise<void> {
  const settings = await loadSettingsFromStorage();
  config.thresholds.minimumSpent = settings.minimumSpent;
  config.thresholds.proposalsMin = settings.proposalsMin;
  config.thresholds.proposalsMax = settings.proposalsMax;
  console.log("Updated config with settings:", settings);
}


