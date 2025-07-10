import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export default async function initializeDb() {
  logger.info("Executing initializeDb");

  await db`
    DROP TABLE IF EXISTS "user" CASCADE;
  `;
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
    DROP TABLE IF EXISTS "stock" CASCADE;
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
    DROP TABLE IF EXISTS "list" CASCADE;
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
  await db`
    DROP TABLE IF EXISTS "list_stock" CASCADE;
  `;
  await db`
    CREATE TABLE "list_stock" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "listId" TEXT NOT NULL REFERENCES "list" ("id"),
      "stockId" TEXT NOT NULL REFERENCES "stock" ("id"),
      "createdAt" TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL
    );
  `;

  logger.info("Completed initializeDb");
}

if (import.meta.main) {
  await initializeDb();
}
