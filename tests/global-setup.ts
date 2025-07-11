import initializeDb from "../scripts/initializeDb";
import seedDb from "../scripts/seedDb";

async function globalSetup() {
  console.log("Setting up test database...");

  // Set environment variables for test database
  process.env.NODE_ENV = "test";
  process.env.POSTGRES_PORT = process.env.POSTGRES_TEST_PORT || "5433";
  process.env.POSTGRES_DB = process.env.POSTGRES_TEST_DB || "based_test";
  process.env.POSTGRES_USER = process.env.POSTGRES_TEST_USER || "postgres";
  process.env.POSTGRES_PASSWORD =
    process.env.POSTGRES_TEST_PASSWORD || "postgres";

  // Set up test database before running tests
  try {
    console.log("Starting test database setup...");
    await initializeDb();
    await seedDb();
    console.log("✅ Test database setup completed successfully");
  } catch (error) {
    console.error("❌ Failed to set up test database:", error);
    console.error(
      "Make sure the postgres-test service is running with 'docker-compose up postgres-test'",
    );
    throw error;
  }
}

export default globalSetup;
