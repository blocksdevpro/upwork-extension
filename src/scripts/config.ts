// Configuration interface and defaults
export interface ExtensionConfig {
  selectors: {
    jobTileList: string;
    clientSpending: string;
    proposals: string;
  };
  thresholds: {
    minimumSpent: number;
    proposalsMin: number;
    proposalsMax: number;
  };
  logging: {
    enabled: boolean;
    level: "debug" | "info" | "warn" | "error";
  };
  performance: {
    debounceDelay: number;
    maxProcessingTime: number;
  };
  autoRefresh?: {
    enabled: boolean;
    refreshIntervalMs: number;
  };
  filteringEnabled: boolean;
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
  filteringEnabled: true,
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
  filteringEnabled: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshIntervalMs: number;
}> {
  try {
    const result = await chrome.storage.sync.get([
      "minimumSpent",
      "proposalsMin",
      "proposalsMax",
      "filteringEnabled",
      "autoRefreshEnabled",
      "autoRefreshIntervalMs",
    ]);
    return {
      minimumSpent: result.minimumSpent || 1,
      proposalsMin: result.proposalsMin || 0,
      proposalsMax: result.proposalsMax || 100,
      filteringEnabled:
        typeof result.filteringEnabled === "boolean"
          ? result.filteringEnabled
          : true,
      autoRefreshEnabled:
        typeof result.autoRefreshEnabled === "boolean"
          ? result.autoRefreshEnabled
          : true,
      autoRefreshIntervalMs:
        typeof result.autoRefreshIntervalMs === "number" &&
        result.autoRefreshIntervalMs > 0
          ? result.autoRefreshIntervalMs
          : 60000,
    };
  } catch (error) {
    console.error("Error loading settings from storage:", error);
    return {
      minimumSpent: 1,
      proposalsMin: 0,
      proposalsMax: 100,
      filteringEnabled: true,
      autoRefreshEnabled: true,
      autoRefreshIntervalMs: 60000,
    };
  }
}

export async function updateConfigWithSettings(
  config: ExtensionConfig
): Promise<void> {
  const settings = await loadSettingsFromStorage();
  config.thresholds.minimumSpent = settings.minimumSpent;
  config.thresholds.proposalsMin = settings.proposalsMin;
  config.thresholds.proposalsMax = settings.proposalsMax;
  config.filteringEnabled = settings.filteringEnabled;
  if (!config.autoRefresh) {
    config.autoRefresh = {
      enabled: settings.autoRefreshEnabled,
      refreshIntervalMs: settings.autoRefreshIntervalMs,
    };
  } else {
    config.autoRefresh.enabled = settings.autoRefreshEnabled;
    config.autoRefresh.refreshIntervalMs = settings.autoRefreshIntervalMs;
  }
  console.log("Updated config with settings:", settings);
}


