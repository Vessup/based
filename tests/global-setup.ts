import initializeDb from "../scripts/initializeDb";
import seedDb from "../scripts/seedDb";

async function globalSetup() {
  console.log("Setting up test database...");

  // Set environment variables for test database
  process.env.NODE_ENV = "test";
  process.env.POSTGRES_PORT = "5433";
  process.env.POSTGRES_DB = "based_test";

  // Set up test database before running tests
  try {
    await initializeDb();
    await seedDb();
    console.log("Test database setup completed successfully");
  } catch (error) {
    console.error("Failed to set up test database:", error);
    throw error;
  }
}

export default globalSetup;
