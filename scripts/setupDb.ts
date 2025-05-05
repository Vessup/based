import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export default async function setupDb() {
  logger.info("Executing setupDb");
  await db`
    CREATE TABLE "user" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL
    );
  `;
  await db`
    CREATE TABLE "stock" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "symbol" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL
    );
  `;
  await db`
    CREATE TABLE "list" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user" ("id")
    );
  `;
  logger.info("Completed setupDb");
}

if (import.meta.main) {
  await setupDb();
}
