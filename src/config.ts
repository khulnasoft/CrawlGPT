import { z } from "zod";
import type { Page } from "playwright";
import { configDotenv } from "dotenv";

/**
 * Enum for supported output formats
 */
export enum OutputFormat {
  JSON = "json",
  CSV = "csv",
  MARKDOWN = "markdown",
}

configDotenv();

const Page: z.ZodType<Page> = z.any();

export const configSchema = z.object({
  /**
   * URL to start the crawl, if url is a sitemap, it will crawl all pages in the sitemap
   * @example "https://synopkg.github.io/synopkg"
   * @example "https://www.khulnasoft.com/sitemap.xml"
   * @default ""
   */
  url: z.string(),
  /**
   * Pattern to match against for links on a page to subsequently crawl
   * @example "https://synopkg.github.io/synopkg/**"
   * @default ""
   */
  match: z.string().or(z.array(z.string())),
  /**
   * Pattern to match against for links on a page to exclude from crawling
   * @example "https://synopkg.github.io/synopkg/**"
   * @default ""
   */
  exclude: z.string().or(z.array(z.string())).optional(),
  /**
   * Selector to grab the inner text from
   * @example ".docs-builder-container"
   * @default ""
   */
  selector: z.string().optional(),
  /**
   * Don't crawl more than this many pages
   * @default 50
   */
  maxPagesToCrawl: z.number().int().positive(),
  /**
   * File name for the finished data
   * @default "output.json"
   */
  outputFileName: z.string(),
  /** Optional cookie to be set. E.g. for Cookie Consent */
  cookie: z
    .union([
      z.object({
        name: z.string(),
        value: z.string(),
      }),
      z.array(
        z.object({
          name: z.string(),
          value: z.string(),
        }),
      ),
    ])
    .optional(),
  /** Optional function to run for each page found */
  onVisitPage: z
    .function()
    .args(
      z.object({
        page: Page,
        pushData: z
          .function()
          .args(z.any(), z.string().optional())
          .returns(z.promise(z.void())),
      }),
    )
    .returns(z.promise(z.void()))
    .optional(),
  /** Optional timeout for waiting for a selector to appear */
  waitForSelectorTimeout: z.number().int().nonnegative().optional(),
  /** Optional resources to exclude
   *
   * @example
   * ['png','jpg','jpeg','gif','svg','css','js','ico','woff','woff2','ttf','eot','otf','mp4','mp3','webm','ogg','wav','flac','aac','zip','tar','gz','rar','7z','exe','dmg','apk','csv','xls','xlsx','doc','docx','pdf','epub','iso','dmg','bin','ppt','pptx','odt','avi','mkv','xml','json','yml','yaml','rss','atom','swf','txt','dart','webp','bmp','tif','psd','ai','indd','eps','ps','zipx','srt','wasm','m4v','m4a','webp','weba','m4b','opus','ogv','ogm','oga','spx','ogx','flv','3gp','3g2','jxr','wdp','jng','hief','avif','apng','avifs','heif','heic','cur','ico','ani','jp2','jpm','jpx','mj2','wmv','wma','aac','tif','tiff','mpg','mpeg','mov','avi','wmv','flv','swf','mkv','m4v','m4p','m4b','m4r','m4a','mp3','wav','wma','ogg','oga','webm','3gp','3g2','flac','spx','amr','mid','midi','mka','dts','ac3','eac3','weba','m3u','m3u8','ts','wpl','pls','vob','ifo','bup','svcd','drc','dsm','dsv','dsa','dss','vivo','ivf','dvd','fli','flc','flic','flic','mng','asf','m2v','asx','ram','ra','rm','rpm','roq','smi','smil','wmf','wmz','wmd','wvx','wmx','movie','wri','ins','isp','acsm','djvu','fb2','xps','oxps','ps','eps','ai','prn','svg','dwg','dxf','ttf','fnt','fon','otf','cab']
   */
  resourceExclusions: z.array(z.string()).optional(),

  /** Optional maximum file size in megabytes to include in the output file
   * @example 1
   */
  maxFileSize: z.number().int().positive().optional(),
  /** Optional maximum number tokens to include in the output file
   * @example 5000
   * @example 5000
   */
  maxTokens: z.number().int().positive().optional(),
  /**
   * Rate limiting: Delay between requests in milliseconds
   * @example 1000
   * @default 0
   */
  requestDelay: z.number().int().nonnegative().optional().default(0),
  /**
   * Retry configuration for failed requests
   */
  retry: z
    .object({
      /**
       * Maximum number of retries for a failed request
       * @example 3
       * @default 3
       */
      maxRetries: z.number().int().nonnegative().optional().default(3),
      /**
       * Initial delay in milliseconds before the first retry
       * @example 1000
       * @default 1000
       */
      initialDelay: z.number().int().positive().optional().default(1000),
      /**
       * Maximum delay in milliseconds between retries
       * @example 30000
       * @default 30000
       */
      maxDelay: z.number().int().positive().optional().default(30000),
    })
    .optional()
    .default({}),
  /**
   * Content deduplication settings
   */
  deduplication: z
    .object({
      /**
       * Enable content deduplication
       * @default false
       */
      enabled: z.boolean().optional().default(false),
      /**
       * Method to use for deduplication
       * 'exact': Exact string matching
       * 'similarity': Use similarity threshold
       * @default "exact"
       */
      method: z.enum(["exact", "similarity"]).optional().default("exact"),
      /**
       * Similarity threshold (0-1) for content to be considered duplicate when using similarity method
       * @example 0.9
       * @default 0.9
       */
      similarityThreshold: z.number().min(0).max(1).optional().default(0.9),
    })
    .optional()
    .default({}),
  /**
   * Output format configuration
   */
  outputFormat: z
    .nativeEnum(OutputFormat)
    .optional()
    .default(OutputFormat.JSON),
  /**
   * Content filtering settings
   */
  contentFiltering: z
    .object({
      /**
       * Patterns to include in output (content must match at least one)
       * @example ["product", "pricing"]
       */
      includePatterns: z.array(z.string()).optional(),
      /**
       * Patterns to exclude from output
       * @example ["login", "sign up"]
       */
      excludePatterns: z.array(z.string()).optional(),
      /**
       * Minimum content length to include in output
       * @example 100
       */
      minContentLength: z.number().int().nonnegative().optional(),
    })
    .optional()
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
