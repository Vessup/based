import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { faker } from "@faker-js/faker";

export async function seedDb() {
  logger.info("Executing seedDb");

  const users = Array.from({ length: 30 }, () => {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  await db`INSERT INTO "user" ${db(users)}`;
  logger.info(`Inserted ${users.length} users`);

  // Generate stocks with UUIDs
  const stockSymbols = [
    ["AAPL", "Apple Inc."],
    ["GOOG", "Alphabet Inc."],
    ["NVDA", "NVIDIA Corporation"],
    ["TGT", "Target Corporation"],
    ["KSS", "Kohls Corporation"],
    ["SYF", "Synchrony Financial"],
    ["AMD", "Advanced Micro Devices, Inc."],
    ["HOOD", "Robinhood Markets, Inc."],
    ["ULTA", "Ulta Beauty, Inc."],
    ["LOW", "Lowes Companies, Inc."],
    ["HD", "The Home Depot, Inc."],
    ["RKT", "Rocket Companies, Inc."],
    ["GSAT", "Globalstar, Inc."],
    ["RKLB", "Rocket Lab USA, Inc."],
    ["MSFT", "Microsoft Corporation"],
    ["UPS", "United Parcel Service, Inc."],
    ["AXP", "American Express Company"],
    ["NVO", "Novo Nordisk A/S"],
    ["JNJ", "Johnson & Johnson"],
    ["MRK", "Merck & Co., Inc."],
    ["UBER", "Uber Technologies, Inc."],
  ];
  const stocks = stockSymbols.map(([symbol, name]) => ({
    id: faker.string.uuid(),
    symbol,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db`INSERT INTO "stock" ${db(stocks)}`;
  logger.info(`Inserted ${stocks.length} stocks`);

  // For each user, create 1-5 lists
  const lists = users.flatMap((user) => {
    const numLists = faker.number.int({ min: 1, max: 5 });
    return Array.from({ length: numLists }, () => ({
      id: faker.string.uuid(),
      name: faker.word.words({ count: { min: 1, max: 3 } }),
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });
  await db`INSERT INTO "list" ${db(lists)}`;
  logger.info(`Inserted ${lists.length} lists`);

  // For each list, add a random number of stocks (1 to all available)
  const stockIds = stocks.map((s) => s.id);
  const listStocks = lists.flatMap((list) => {
    const numStocks = faker.number.int({ min: 1, max: stockIds.length });
    const shuffled = faker.helpers.shuffle(stockIds);
    return shuffled.slice(0, numStocks).map((stockId) => ({
      id: faker.string.uuid(),
      listId: list.id,
      stockId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });
  await db`INSERT INTO "list_stock" ${db(listStocks)}`;
  logger.info(`Inserted ${listStocks.length} list_stock records`);

  logger.info("Completed seedDb");
}

if (import.meta.main) {
  await seedDb();
}
