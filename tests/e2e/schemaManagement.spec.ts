import { expect, test } from "@playwright/test";

test.describe("Schema Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the sidebar to be visible
    await page.waitForSelector('[data-slot="sidebar"]', { state: "visible" });
  });

  test("should create a new schema", async ({ page }) => {
    // Click the Add Schema button
    await page.getByTestId("add-schema-button").click();

    // Wait for dialog to appear
    const dialog = page.getByTestId("create-schema-dialog");
    await expect(dialog).toBeVisible();

    // Generate a unique schema name for testing
    const schemaName = `test_schema_${Date.now()}`;

    // Fill in the schema name
    await page.getByTestId("schema-name-input").fill(schemaName);

    // Click Create Schema button
    await page.getByTestId("create-schema-submit-button").click();

    // Wait for dialog to close with increased timeout
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit for the sidebar to update
    await page.waitForTimeout(500);

    // Verify the new schema appears in the sidebar
    const sidebarMenu = page.locator('[data-slot="sidebar-menu"]');
    await expect(sidebarMenu.locator(`text="${schemaName}"`)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should rename a schema", async ({ page }) => {
    // First create a schema to rename
    await page.getByTestId("add-schema-button").click();

    const createDialog = page.getByTestId("create-schema-dialog");
    await expect(createDialog).toBeVisible();

    const originalName = `rename_test_${Date.now()}`;
    await page.getByTestId("schema-name-input").fill(originalName);
    await page.getByTestId("create-schema-submit-button").click();

    // Wait for dialog to close with increased timeout
    await expect(createDialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit for the sidebar to update
    await page.waitForTimeout(500);

    // Hover over the schema to show action buttons
    const schemaItem = page.getByTestId(`schema-item-${originalName}`);
    await schemaItem.hover();

    // Click the more actions button to open dropdown
    const moreActionsButton = page.getByTestId(
      `schema-menu-action-${originalName}`,
    );
    await moreActionsButton.click();

    // Click the rename option
    await page.getByTestId(`rename-schema-${originalName}`).click();

    // Wait for rename dialog
    const renameDialog = page.getByTestId("rename-schema-dialog");
    await expect(renameDialog).toBeVisible();

    // Enter new name
    const newName = `renamed_${Date.now()}`;
    const input = page.getByTestId("rename-schema-input");
    await input.clear();
    await input.fill(newName);

    // Click Rename button
    await page.getByTestId("rename-schema-submit-button").click();

    // Wait for dialog to close
    await expect(renameDialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit for the sidebar to update
    await page.waitForTimeout(500);

    // Verify the renamed schema appears in the sidebar and original name is gone
    const sidebarMenu = page.locator('[data-slot="sidebar-menu"]');
    await expect(sidebarMenu.locator(`text="${newName}"`)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      sidebarMenu.locator(`text="${originalName}"`),
    ).not.toBeVisible();
  });

  test("should delete a schema", async ({ page }) => {
    // First create a schema to delete
    await page.getByTestId("add-schema-button").click();

    const createDialog = page.getByTestId("create-schema-dialog");
    await expect(createDialog).toBeVisible();

    const schemaName = `delete_test_${Date.now()}`;
    await page.getByTestId("schema-name-input").fill(schemaName);
    await page.getByTestId("create-schema-submit-button").click();

    // Wait for dialog to close with increased timeout
    await expect(createDialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit for the sidebar to update
    await page.waitForTimeout(500);

    // Hover over the schema to show action buttons
    const schemaItem = page.getByTestId(`schema-item-${schemaName}`);
    await schemaItem.hover();

    // Click the more actions button to open dropdown
    const moreActionsButton = page.getByTestId(
      `schema-menu-action-${schemaName}`,
    );
    await moreActionsButton.click();

    // Click the delete option
    await page.getByTestId(`delete-schema-${schemaName}`).click();

    // Wait for delete confirmation dialog
    const deleteDialog = page.getByTestId("delete-schema-dialog");
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.locator(`text="${schemaName}"`)).toBeVisible();

    // Confirm deletion
    await page.getByTestId("delete-schema-confirm-button").click();

    // Wait for dialog to close
    await expect(deleteDialog).not.toBeVisible({ timeout: 10000 });

    // Wait a bit for the sidebar to update
    await page.waitForTimeout(500);

    // Verify the schema is no longer in the sidebar
    const sidebarMenu = page.locator('[data-slot="sidebar-menu"]');
    await expect(sidebarMenu.locator(`text="${schemaName}"`)).not.toBeVisible();
  });
});
