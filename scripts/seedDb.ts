import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

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
      ('2', 'GOOG', 'Alphabet Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('3', 'NVDA', 'Nvidia Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('4', 'TGT', 'Target Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('5', 'KSS', 'Kohls', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('6', 'SYF', 'Synchrony Financial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('7', 'AMD', 'Advanced Micro Devices', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('8', 'HOOD', 'Robinhood', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('9', 'ULTA', 'Ulta Beauty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('10', 'LOW', 'Lowes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('11', 'HD', 'Home Depot', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('12', 'RKT', 'Rocket Companies', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('13', 'GSAT', 'Globalstar Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('14', 'RKLB', 'Rocket Lab Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('15', 'MSFT', 'Microsoft Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('16', 'UPS', 'United Postal Service Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('17', 'AXP', 'American Express Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('18', 'NVO', 'Novo Nordisk Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('19', 'JNJ', 'Johnson & Johnson Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('20', 'MRK', 'Merck Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('21', 'UBER', 'Uber Inc.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  logger.info("Completed seedDb");
}

if (import.meta.main) {
  await seedDb();
}
