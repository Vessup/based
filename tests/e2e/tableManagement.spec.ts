import { expect, test } from "@playwright/test";

test.describe("Table Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the sidebar to be visible
    await page.waitForSelector('[data-slot="sidebar"]', { state: "visible" });
  });

  test("should create a new table", async ({ page }) => {
    // The app starts on the public schema by default, so we can create a table directly

    // Click the Add table button
    await page.getByTestId("add-table-button").click();

    // Wait for dialog to appear
    const dialog = page.getByTestId("create-table-dialog");
    await expect(dialog).toBeVisible();

    // Verify the dialog mentions the schema (public)
    await expect(dialog.locator('text="public"')).toBeVisible();

    // Generate a unique table name for testing
    const tableName = `test_table_${Date.now()}`;

    // Fill in the table name
    await page.getByTestId("table-name-input").fill(tableName);

    // Click Create Table button
    await page.getByTestId("create-table-submit-button").click();

    // Wait for dialog to close with increased timeout
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit longer for the sidebar to update and table to be loaded
    await page.waitForTimeout(1000);

    // Verify the new table appears in the sidebar tables section
    // Look for the table in the sidebar menu within the Tables group
    const sidebar = page.locator('[data-slot="sidebar"]');
    const tablesGroup = sidebar.locator('text="Tables"').locator("../..");
    await expect(tablesGroup.locator(`text="${tableName}"`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should close create table dialog on cancel", async ({ page }) => {
    // Click the Add table button
    await page.getByTestId("add-table-button").click();

    // Wait for dialog to appear
    const dialog = page.getByTestId("create-table-dialog");
    await expect(dialog).toBeVisible();

    // Click Cancel button
    await dialog.locator('button:has-text("Cancel")').click();

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
  });

  test("should create table with Enter key", async ({ page }) => {
    // Click the Add table button
    await page.getByTestId("add-table-button").click();

    // Wait for dialog to appear
    const dialog = page.getByTestId("create-table-dialog");
    await expect(dialog).toBeVisible();

    // Generate a unique table name for testing
    const tableName = `test_table_enter_${Date.now()}`;

    // Fill in the table name and press Enter
    const input = page.getByTestId("table-name-input");
    await input.fill(tableName);
    await input.press("Enter");

    // Wait for dialog to close with increased timeout
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit longer for the sidebar to update and table to be loaded
    await page.waitForTimeout(1000);

    // Verify the new table appears in the sidebar tables section
    // Look for the table in the sidebar menu within the Tables group
    const sidebar = page.locator('[data-slot="sidebar"]');
    const tablesGroup = sidebar.locator('text="Tables"').locator("../..");
    await expect(tablesGroup.locator(`text="${tableName}"`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should search and filter tables", async ({ page }) => {
    // First create a few test tables
    const tableNames = [
      `alpha_${Date.now()}`,
      `beta_${Date.now()}`,
      `gamma_${Date.now()}`,
    ];

    for (const tableName of tableNames) {
      // Click the Add table button
      await page.getByTestId("add-table-button").click();

      // Fill and create table
      const dialog = page.getByTestId("create-table-dialog");
      await page.getByTestId("table-name-input").fill(tableName);
      await page.getByTestId("create-table-submit-button").click();
      await expect(dialog).not.toBeVisible({ timeout: 10000 });

      // Wait a bit between creations
      await page.waitForTimeout(500);
    }

    // Now test the search functionality
    const searchInput = page.locator('input[placeholder="Search tables..."]');
    const sidebar = page.locator('[data-slot="sidebar"]');
    const tablesGroup = sidebar.locator('text="Tables"').locator("../..");

    // Search for "alpha"
    await searchInput.fill("alpha");

    // Should only see the alpha table
    await expect(tablesGroup.locator(`text="${tableNames[0]}"`)).toBeVisible();
    await expect(
      tablesGroup.locator(`text="${tableNames[1]}"`),
    ).not.toBeVisible();
    await expect(
      tablesGroup.locator(`text="${tableNames[2]}"`),
    ).not.toBeVisible();

    // Clear search
    await searchInput.clear();

    // All tables should be visible again
    for (const tableName of tableNames) {
      await expect(tablesGroup.locator(`text="${tableName}"`)).toBeVisible();
    }
  });
});
