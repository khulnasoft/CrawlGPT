import express, { Express } from "express";
import cors from "cors";
import { readFile } from "fs/promises";
import { Config, configSchema } from "./config.js";
import { configDotenv } from "dotenv";
import swaggerUi from "swagger-ui-express";
import rateLimit from "express-rate-limit";
// @ts-ignore
import swaggerDocument from "../swagger-output.json" assert { type: "json" };
import CrawlGPTCore from "./core.js";
import { PathLike } from "fs";

configDotenv();

const app: Express = express();
const port = Number(process.env.API_PORT) || 3000;
const hostname = process.env.API_HOST || "localhost";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(cors());
app.use(express.json());
app.use(limiter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Define a POST route to accept config and run the crawler
app.post("/crawl", async (req, res) => {
  const config: Config = req.body;
  try {
    const validatedConfig = configSchema.parse(config);
    const crawler = new CrawlGPTCore(validatedConfig);
    await crawler.crawl();
    const outputFileName: PathLike = await crawler.write();
    const outputFileContent = await readFile(outputFileName, "utf-8");
    res.contentType("application/json");
    return res.send(outputFileContent);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error occurred during crawling", error });
  }
});

app.listen(port, hostname, () => {
  console.log(`API server listening at http://${hostname}:${port}`);
});

export default app;
