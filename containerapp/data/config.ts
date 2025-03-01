import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://synopkg.github.io/synopkg",
  match: "https://synopkg.github.io/synopkg/**",
  maxPagesToCrawl: 50,
  outputFileName: "../data/output.json",
  requestDelay: 1000, // Default request delay in milliseconds
  retry: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
  },
  deduplication: {
    enabled: true,
    strategy: "url",
  },
  outputFormat: "json", // or any other default value e.g. 'xml'
  contentFiltering: {
    enabled: false,
    keywords: [],
  },
};
