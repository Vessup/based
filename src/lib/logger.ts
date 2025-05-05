import {
  ansiColorFormatter,
  configure,
  getConsoleSink,
  getLogger,
} from "@logtape/logtape";
export { getLogger } from "@logtape/logtape";

await configure({
  sinks: { console: getConsoleSink({ formatter: ansiColorFormatter }) },
  loggers: [
    {
      category: ["logtape", "meta"],
      lowestLevel: "warning",
      sinks: ["console"],
    },
    {
      category: "based",
      lowestLevel: process.env.DEBUG ? "debug" : "info",
      sinks: ["console"],
    },
  ],
});

export const logger = getLogger(["based"]);
