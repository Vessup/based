import { execSync } from "node:child_process";

async function globalSetup() {
  console.log("Setting up test database...");

  // Set up test database before running tests
  try {
    execSync("bun run setupTestDb", { stdio: "inherit" });
    console.log("Test database setup completed successfully");
  } catch (error) {
    console.error("Failed to set up test database:", error);
    throw error;
  }
}

export default globalSetup;
