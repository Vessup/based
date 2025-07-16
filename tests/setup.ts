import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../src/lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function globalSetup() {
  logger.info("Executing Playwright globalSetup");

  try {
    execSync("bun setupDb", {
      cwd: resolve(__dirname, ".."),
      stdio: "inherit",
    });
  } catch (error) {
    logger.error("Error running setupDbForTesting: {error}", { error });
  }

  logger.info("Completed Playwright globalSetup");
}

export default globalSetup;
