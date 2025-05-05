import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

export default async function seedDb() {
  logger.info("Executing seedDb");
  await db`
    INSERT INTO "user" ("id", "name", "email", "createdAt", "updatedAt")
    VALUES
      ('1', 'John Doe', 'john.doe@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('2', 'Jane Smith', 'jane.smith@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  await db`
    INSERT INTO "stock" ("id", "symbol", "name", "createdAt", "updatedAt")
    VALUES
      ('1', 'AAPL', 'Apple Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('2', 'GOOGL', 'Alphabet Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  logger.info("Completed seedDb");
}

if (import.meta.main) {
  await seedDb();
}
