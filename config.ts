import { Config, OutputFormat } from "./src/config.js";

export const defaultConfig: Config = {
  url: "https://synopkg.github.io/synopkg",
  match: "https://synopkg.github.io/synopkg/**",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
  maxTokens: 2000000,
  requestDelay: 0,
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000
  },
  deduplication: {
    enabled: false,
    method: "exact",
    similarityThreshold: 0.9
  },
  outputFormat: OutputFormat.JSON,
  contentFiltering: {
    includePatterns: [],
    excludePatterns: []
  }
};
