import initializeDb from "../scripts/initializeDb";
import { seedDb } from "../scripts/seedDb";
import { db } from "../src/lib/db";
import { logger } from "../src/lib/logger";

export default async function setupDbForTesting() {
  logger.info("Executing setupDbForTesting");

  // Set environment variables for test database
  process.env.POSTGRES_PORT = process.env.POSTGRES_TEST_PORT || "5433";
  process.env.POSTGRES_DB = process.env.POSTGRES_TEST_DB || "based_test";
  process.env.POSTGRES_USER = process.env.POSTGRES_TEST_USER || "postgres";
  process.env.POSTGRES_PASSWORD =
    process.env.POSTGRES_TEST_PASSWORD || "postgres";

  await initializeDb();

  await seedDb();

  logger.info("Completed setupDbForTesting");
}

if (import.meta.main) {
  try {
    await setupDbForTesting();
  } finally {
    // Close main database connection.
    await db.close();
  }
}
