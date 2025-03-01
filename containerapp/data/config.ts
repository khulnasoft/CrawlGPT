import { Config } from "./src/config";

export const defaultConfig: Config = {
  url: "https://synopkg.github.io/synopkg",
  match: "https://www.khulnasoft.com/c/docs/**",
  maxPagesToCrawl: 50,
  outputFileName: "../data/output.json",
};
