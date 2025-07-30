import { expect, test } from "@playwright/test";

test.describe("Table Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the sidebar to be visible
    await page.waitForSelector('[data-slot="sidebar"]', { state: "visible" });
  });

  test("should create a new table", async ({ page }) => {
    // First ensure we're on the public schema
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });

    // Click to open schema popover
    await schemaButton.click();

    // Select public schema
    const popover = page.locator('[data-slot="popover-content"]');
    await popover.locator('text="public"').click();

    // Wait for tables to load
    await page.waitForTimeout(1000);

    // Click the Add table button
    const addTableButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add table"') });
    await addTableButton.click();

    // Wait for dialog to appear
    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Create New Table" });
    await expect(dialog).toBeVisible();

    // Verify the dialog mentions the schema
    await expect(dialog.locator('text="public"')).toBeVisible();

    // Generate a unique table name for testing
    const tableName = `test_table_${Date.now()}`;

    // Fill in the table name
    await dialog
      .locator('input[placeholder="Enter table name"]')
      .fill(tableName);

    // Click Create Table button
    await dialog.locator('button:has-text("Create Table")').click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible();

    // Verify the new table appears in the sidebar
    const tablesList = page.locator('[data-slot="sidebar-menu"]').last();
    await expect(tablesList.locator(`text="${tableName}"`)).toBeVisible();
  });

  test("should show error when creating table with empty name", async ({
    page,
  }) => {
    // Click the Add table button
    const addTableButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add table"') });
    await addTableButton.click();

    // Wait for dialog to appear
    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Create New Table" });
    await expect(dialog).toBeVisible();

    // Click Create Table button without entering a name
    await dialog.locator('button:has-text("Create Table")').click();

    // Verify error message appears
    await expect(
      dialog.locator('text="Table name cannot be empty"'),
    ).toBeVisible();

    // Dialog should still be open
    await expect(dialog).toBeVisible();
  });

  test("should close create table dialog on cancel", async ({ page }) => {
    // Click the Add table button
    const addTableButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add table"') });
    await addTableButton.click();

    // Wait for dialog to appear
    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Create New Table" });
    await expect(dialog).toBeVisible();

    // Click Cancel button
    await dialog.locator('button:has-text("Cancel")').click();

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
  });

  test("should create table with Enter key", async ({ page }) => {
    // Click the Add table button
    const addTableButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add table"') });
    await addTableButton.click();

    // Wait for dialog to appear
    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Create New Table" });
    await expect(dialog).toBeVisible();

    // Generate a unique table name for testing
    const tableName = `test_table_enter_${Date.now()}`;

    // Fill in the table name and press Enter
    const input = dialog.locator('input[placeholder="Enter table name"]');
    await input.fill(tableName);
    await input.press("Enter");

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible();

    // Verify the new table appears in the sidebar
    const tablesList = page.locator('[data-slot="sidebar-menu"]').last();
    await expect(tablesList.locator(`text="${tableName}"`)).toBeVisible();
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
      const addTableButton = page
        .locator('[data-slot="sidebar-group-action"]')
        .filter({ has: page.locator('text="Add table"') });
      await addTableButton.click();

      // Fill and create table
      const dialog = page
        .locator('[role="dialog"]')
        .filter({ hasText: "Create New Table" });
      await dialog
        .locator('input[placeholder="Enter table name"]')
        .fill(tableName);
      await dialog.locator('button:has-text("Create Table")').click();
      await expect(dialog).not.toBeVisible();

      // Wait a bit between creations
      await page.waitForTimeout(500);
    }

    // Now test the search functionality
    const searchInput = page.locator('input[placeholder="Search tables..."]');

    // Search for "alpha"
    await searchInput.fill("alpha");
    const tablesList = page.locator('[data-slot="sidebar-menu"]').last();

    // Should only see the alpha table
    await expect(tablesList.locator(`text="${tableNames[0]}"`)).toBeVisible();
    await expect(
      tablesList.locator(`text="${tableNames[1]}"`),
    ).not.toBeVisible();
    await expect(
      tablesList.locator(`text="${tableNames[2]}"`),
    ).not.toBeVisible();

    // Clear search
    await searchInput.clear();

    // All tables should be visible again
    for (const tableName of tableNames) {
      await expect(tablesList.locator(`text="${tableName}"`)).toBeVisible();
    }
  });
});
