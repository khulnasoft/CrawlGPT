import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Crawl GPT API",
    description: "Crawl GPT",
  },
  host: "localhost:5000",
};

const outputFile = "swagger-output.json";
const routes = ["./src/server.ts"];

swaggerAutogen()(outputFile, routes, doc);
