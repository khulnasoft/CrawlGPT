// For more information, see https://crawlee.dev/
import { Configuration, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema, OutputFormat } from "./config.js";
import { Page } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";
import { PathLike } from "fs";
import { stringify } from "csv-stringify/sync";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { marked } from "marked";

let pageCounter = 0;
let crawler: PlaywrightCrawler;
let visitedUrls = new Set<string>();
let contentHashes = new Set<string>();

// Helper function to create content hash for deduplication
function createContentHash(content: string): string {
  return crypto.createHash("md5").update(content).digest("hex");
}

// Helper function for delay with rate limiting
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function for exponential backoff
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number,
): Promise<T> {
  let retries = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }

      const delayTime = baseDelay * Math.pow(2, retries - 1);
      console.log(
        `Retry attempt ${retries}/${maxRetries} after ${delayTime}ms`,
      );
      await delay(delayTime);
    }
  }
}

// Helper function to filter content based on patterns
function filterContent(content: string, patterns: RegExp[]): string {
  if (!patterns || patterns.length === 0) {
    return content;
  }

  let filteredContent = content;
  for (const pattern of patterns) {
    filteredContent = filteredContent.replace(pattern, "");
  }

  return filteredContent;
}

// Helper function to check if content matches any include pattern
function shouldIncludeContent(
  content: string,
  includePatterns: RegExp[],
): boolean {
  if (!includePatterns || includePatterns.length === 0) {
    return true;
  }

  return includePatterns.some((pattern) => pattern.test(content));
}

// Helper function to check if content matches any exclude pattern
function shouldExcludeContent(
  content: string,
  excludePatterns: RegExp[],
): boolean {
  if (!excludePatterns || excludePatterns.length === 0) {
    return false;
  }

  return excludePatterns.some((pattern) => pattern.test(content));
}

export function getPageHtml(page: Page, selector = "body") {
  return page.evaluate((selector) => {
    // Check if the selector is an XPath
    if (selector.startsWith("/")) {
      const elements = document.evaluate(
        selector,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      let result = elements.iterateNext();
      return result ? result.textContent || "" : "";
    } else {
      // Handle as a CSS selector
      const el = document.querySelector(selector) as HTMLElement | null;
      return el?.innerText || "";
    }
  }, selector);
}

export async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    (xpath) => {
      const elements = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ANY_TYPE,
        null,
      );
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout },
  );
}

export async function crawl(config: Config) {
  configSchema.parse(config);

  // Reset tracking sets on each crawl
  visitedUrls = new Set<string>();
  contentHashes = new Set<string>();

  if (process.env.NO_CRAWL !== "true") {
    // PlaywrightCrawler crawls the web using a headless
    // browser controlled by the Playwright library.
    crawler = new PlaywrightCrawler(
      {
        // Use the requestHandler to process each of the crawled pages.
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
          // Implement rate limiting between requests
          // Implement rate limiting between requests
          if (config.requestDelay && pageCounter > 0) {
            log.info(
              `Rate limiting: Waiting ${config.requestDelay}ms before processing next page`,
            );
            await delay(config.requestDelay);
          }
          // Skip duplicate URLs if deduplication is enabled
          if (
            config.deduplication?.enabled &&
            visitedUrls.has(request.loadedUrl)
          ) {
            log.info(`Skipping duplicate URL: ${request.loadedUrl}`);
            return;
          }
          visitedUrls.add(request.loadedUrl);

          let title = "";
          let html = "";

          // Implement retry logic with exponential backoff for page actions
          try {
            await retryWithExponentialBackoff(
              async () => {
                title = await page.title();
                pageCounter++;
                log.info(
                  `Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`,
                );

                // Use custom handling for XPath selector
                if (config.selector) {
                  if (config.selector.startsWith("/")) {
                    await waitForXPath(
                      page,
                      config.selector,
                      config.waitForSelectorTimeout ?? 1000,
                    );
                  } else {
                    await page.waitForSelector(config.selector, {
                      timeout: config.waitForSelectorTimeout ?? 1000,
                    });
                  }
                }

                html = await getPageHtml(page, config.selector);
                return { title, html };
              },
              config.retry?.maxRetries || 3,
              config.retry?.initialDelay || 1000,
            );
          } catch (error) {
            log.error(
              `Failed to process ${request.loadedUrl} after ${config.retry?.maxRetries || 3} retries: ${error}`,
            );
            return;
          }

          // Apply content filtering if configured
          let filteredHtml = html;

          // Apply general content filtering - this should be replaced with more specific filtering
          // logic based on our configuration structure

          // Check include patterns
          if (
            config.contentFiltering?.includePatterns &&
            config.contentFiltering.includePatterns.length > 0
          ) {
            const patterns = config.contentFiltering.includePatterns.map(
              (pattern) => new RegExp(pattern, "g"),
            );
            // Here we could apply specific filtering based on include patterns if needed
          }

          // Check include patterns
          if (
            config.contentFiltering?.includePatterns &&
            config.contentFiltering.includePatterns.length > 0
          ) {
            const patterns = config.contentFiltering.includePatterns.map(
              (pattern) => new RegExp(pattern),
            );
            if (!shouldIncludeContent(html, patterns)) {
              log.info(
                `Skipping page that doesn't match include patterns: ${request.loadedUrl}`,
              );
              return;
            }
          }

          // Check exclude patterns
          if (
            config.contentFiltering?.excludePatterns &&
            config.contentFiltering.excludePatterns.length > 0
          ) {
            const patterns = config.contentFiltering.excludePatterns.map(
              (pattern) => new RegExp(pattern),
            );
            if (shouldExcludeContent(html, patterns)) {
              log.info(
                `Skipping page that matches exclude patterns: ${request.loadedUrl}`,
              );
              return;
            }
          }

          // Content deduplication
          if (config.deduplication?.enabled) {
            const contentHash = createContentHash(filteredHtml);

            // Use similarity method if configured
            if (config.deduplication.method === "similarity") {
              // Here we would implement similarity comparison logic
              // This would require a more complex algorithm to compare content similarity
              // For now, we're just using the exact hash method
            }

            if (contentHashes.has(contentHash)) {
              log.info(
                `Skipping page with duplicate content: ${request.loadedUrl}`,
              );
              return;
            }
            contentHashes.add(contentHash);
          }

          // Save results as JSON to ./storage/datasets/default
          await pushData({
            title,
            url: request.loadedUrl,
            html: filteredHtml,
          });
          if (config.onVisitPage) {
            await config.onVisitPage({ page, pushData });
          }

          // Extract links from the current page
          // and add them to the crawling queue.
          await enqueueLinks({
            globs:
              typeof config.match === "string" ? [config.match] : config.match,
            exclude:
              typeof config.exclude === "string"
                ? [config.exclude]
                : (config.exclude ?? []),
          });
        },
        // Comment this option to scrape the full website.
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        // Uncomment this option to see the browser window.
        // headless: false,
        preNavigationHooks: [
          // Abort requests for certain resource types
          async ({ request, page, log }) => {
            // If there are no resource exclusions, return
            const RESOURCE_EXCLUSTIONS = config.resourceExclusions ?? [];
            if (RESOURCE_EXCLUSTIONS.length === 0) {
              return;
            }
            if (config.cookie) {
              const cookies = (
                Array.isArray(config.cookie) ? config.cookie : [config.cookie]
              ).map((cookie) => {
                return {
                  name: cookie.name,
                  value: cookie.value,
                  url: request.loadedUrl,
                };
              });
              await page.context().addCookies(cookies);
            }
            await page.route(
              `**\/*.{${RESOURCE_EXCLUSTIONS.join()}}`,
              (route) => route.abort("aborted"),
            );
            log.info(
              `Aborting requests for as this is a resource excluded route`,
            );
          },
        ],
      },
      new Configuration({
        purgeOnStart: true,
      }),
    );

    const isUrlASitemap = /sitemap.*\.xml$/.test(config.url);

    if (isUrlASitemap) {
      const listOfUrls = await downloadListOfUrls({ url: config.url });

      // Add the initial URL to the crawling queue.
      await crawler.addRequests(listOfUrls);

      // Run the crawler
      await crawler.run();
    } else {
      // Add first URL to the queue and start the crawl.
      await crawler.run([config.url]);
    }
  }
}

export async function write(config: Config) {
  let nextFileNameString: PathLike = "";
  const jsonFiles = await glob("storage/datasets/default/*.json", {
    absolute: true,
  });

  console.log(`Found ${jsonFiles.length} files to combine...`);

  let currentResults: Record<string, any>[] = [];
  let currentSize: number = 0;
  let fileCounter: number = 1;
  const maxBytes: number = config.maxFileSize
    ? config.maxFileSize * 1024 * 1024
    : Infinity;

  const getStringByteSize = (str: string): number =>
    Buffer.byteLength(str, "utf-8");

  const getExtensionByFormat = (format: OutputFormat): string => {
    switch (format) {
      case OutputFormat.JSON:
        return ".json";
      case OutputFormat.CSV:
        return ".csv";
      case OutputFormat.MARKDOWN:
        return ".md";
      default:
        return ".json";
    }
  };

  const nextFileName = (): string => {
    // Get the appropriate file extension based on output format
    const extension = getExtensionByFormat(
      config.outputFormat || OutputFormat.JSON,
    );
    // Remove any existing extension and add the correct one
    const baseName = config.outputFileName.replace(/\.[^/.]+$/, "");
    return `${baseName}-${fileCounter}${extension}`;
  };
  const writeBatchToFile = async (): Promise<void> => {
    nextFileNameString = nextFileName();

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(nextFileNameString.toString());
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the data in the appropriate format
    switch (config.outputFormat) {
      case OutputFormat.CSV:
        await writeFile(
          nextFileNameString,
          stringify(currentResults, {
            header: true,
            columns: Object.keys(currentResults[0] || {}),
          }),
        );
        break;

      case OutputFormat.MARKDOWN:
        let mdContent = "# Crawled Content\n\n";
        currentResults.forEach((item, index) => {
          mdContent += `## ${index + 1}. ${item.title || "Untitled"}\n\n`;
          mdContent += `**URL:** ${item.url}\n\n`;
          mdContent += `### Content\n\n${item.html}\n\n---\n\n`;
        });
        await writeFile(nextFileNameString, mdContent);
        break;

      case OutputFormat.JSON:
      default:
        await writeFile(
          nextFileNameString,
          JSON.stringify(currentResults, null, 2),
        );
        break;
    }

    console.log(
      `Wrote ${currentResults.length} items to ${nextFileNameString}`,
    );

    // Reset the batch
    currentResults = [];
    currentSize = 0;
    fileCounter++;
  };

  let estimatedTokens: number = 0;

  const addContentOrSplit = async (
    data: Record<string, any>,
  ): Promise<void> => {
    const contentString: string = JSON.stringify(data);
    const tokenCount: number | false = isWithinTokenLimit(
      contentString,
      config.maxTokens || Infinity,
    );

    if (typeof tokenCount === "number") {
      if (estimatedTokens + tokenCount > config.maxTokens!) {
        // Only write the batch if it's not empty (something to write)
        if (currentResults.length > 0) {
          await writeBatchToFile();
        }
        // Since the addition of a single item exceeded the token limit, halve it.
        estimatedTokens = Math.floor(tokenCount / 2);
        currentResults.push(data);
      } else {
        currentResults.push(data);
        estimatedTokens += tokenCount;
      }
    }

    currentSize += getStringByteSize(contentString);
    if (currentSize > maxBytes) {
      await writeBatchToFile();
    }
  };

  // Iterate over each JSON file and process its contents.
  for (const file of jsonFiles) {
    const fileContent = await readFile(file, "utf-8");
    const data: Record<string, any> = JSON.parse(fileContent);
    await addContentOrSplit(data);
  }

  // Check if any remaining data needs to be written to a file.
  if (currentResults.length > 0) {
    await writeBatchToFile();
  }

  return nextFileNameString;
}

class CrawlGPTCore {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async crawl() {
    await crawl(this.config);
  }

  async write(): Promise<PathLike> {
    // we need to wait for the file path as the path can change
    return new Promise((resolve, reject) => {
      write(this.config)
        .then((outputFilePath) => {
          resolve(outputFilePath);
        })
        .catch(reject);
    });
  }
}

export default CrawlGPTCore;
