import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://www.khulnasoft.com/c/docs/developers",
  match: "https://www.khulnasoft.com/c/docs/**",
  maxPagesToCrawl: 50,
  outputFileName: "output.json",
  maxTokens: 2000000,
};
