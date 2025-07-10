import { expect, test } from "@playwright/test";

test.describe("Schema Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the sidebar to be visible
    await page.waitForSelector('[data-slot="sidebar"]', { state: "visible" });
  });

  test("should display schema popover and allow selection", async ({
    page,
  }) => {
    // Click on the schema dropdown button
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });
    await schemaButton.click();

    // Verify popover is open
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();

    // Check that public schema is listed
    await expect(popover.locator('text="public"')).toBeVisible();
  });

  test("should create a new schema", async ({ page }) => {
    // Click the Add Schema button
    const addSchemaButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add Schema"') });
    await addSchemaButton.click();

    // Wait for dialog to appear
    const dialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Create New Schema" });
    await expect(dialog).toBeVisible();

    // Generate a unique schema name for testing
    const schemaName = `test_schema_${Date.now()}`;

    // Fill in the schema name
    await dialog.locator('input[placeholder="Schema name"]').fill(schemaName);

    // Click Create Schema button
    await dialog.locator('button:has-text("Create Schema")').click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible();

    // Verify the new schema appears in the popover
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });
    await schemaButton.click();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover.locator(`text="${schemaName}"`)).toBeVisible();
  });

  test("should rename a schema", async ({ page }) => {
    // First create a schema to rename
    const addSchemaButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add Schema"') });
    await addSchemaButton.click();

    const createDialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Create New Schema" });
    const originalName = `rename_test_${Date.now()}`;
    await createDialog
      .locator('input[placeholder="Schema name"]')
      .fill(originalName);
    await createDialog.locator('button:has-text("Create Schema")').click();
    await expect(createDialog).not.toBeVisible();

    // Open schema popover
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });
    await schemaButton.click();

    // Hover over the schema to show action buttons
    const schemaItem = page
      .locator('[data-slot="popover-content"]')
      .locator(`div:has-text("${originalName}")`)
      .first();
    await schemaItem.hover();

    // Click the rename button (edit icon)
    const renameButton = schemaItem.locator("button").first();
    await renameButton.click();

    // Wait for rename dialog
    const renameDialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Rename Schema" });
    await expect(renameDialog).toBeVisible();

    // Enter new name
    const newName = `renamed_${Date.now()}`;
    const input = renameDialog.locator('input[placeholder="New schema name"]');
    await input.clear();
    await input.fill(newName);

    // Click Rename button
    await renameDialog.locator('button:has-text("Rename")').click();

    // Wait for dialog to close
    await expect(renameDialog).not.toBeVisible();

    // Verify the renamed schema appears in the popover
    await schemaButton.click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover.locator(`text="${newName}"`)).toBeVisible();
    await expect(popover.locator(`text="${originalName}"`)).not.toBeVisible();
  });

  test("should delete a schema", async ({ page }) => {
    // First create a schema to delete
    const addSchemaButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add Schema"') });
    await addSchemaButton.click();

    const createDialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Create New Schema" });
    const schemaName = `delete_test_${Date.now()}`;
    await createDialog
      .locator('input[placeholder="Schema name"]')
      .fill(schemaName);
    await createDialog.locator('button:has-text("Create Schema")').click();
    await expect(createDialog).not.toBeVisible();

    // Open schema popover
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });
    await schemaButton.click();

    // Hover over the schema to show action buttons
    const schemaItem = page
      .locator('[data-slot="popover-content"]')
      .locator(`div:has-text("${schemaName}")`)
      .first();
    await schemaItem.hover();

    // Click the delete button (trash icon)
    const deleteButton = schemaItem.locator("button").nth(1);
    await deleteButton.click();

    // Wait for delete confirmation dialog
    const deleteDialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Delete Schema" });
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.locator(`text="${schemaName}"`)).toBeVisible();

    // Confirm deletion
    await deleteDialog.locator('button:has-text("Delete")').click();

    // Wait for dialog to close
    await expect(deleteDialog).not.toBeVisible();

    // Verify the schema is no longer in the popover
    await schemaButton.click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover.locator(`text="${schemaName}"`)).not.toBeVisible();
  });

  test("should not allow deletion of public schema", async ({ page }) => {
    // Open schema popover
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });
    await schemaButton.click();

    // Hover over public schema
    const publicSchemaItem = page
      .locator('[data-slot="popover-content"]')
      .locator('div:has-text("public")')
      .first();
    await publicSchemaItem.hover();

    // Verify no action buttons appear for public schema
    const actionButtons = publicSchemaItem.locator("button");
    await expect(actionButtons).toHaveCount(0);
  });

  test("should handle delete button state correctly", async ({ page }) => {
    // Create a test schema
    const addSchemaButton = page
      .locator('[data-slot="sidebar-group-action"]')
      .filter({ has: page.locator('text="Add Schema"') });
    await addSchemaButton.click();

    const createDialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Create New Schema" });
    const schemaName = `state_test_${Date.now()}`;
    await createDialog
      .locator('input[placeholder="Schema name"]')
      .fill(schemaName);
    await createDialog.locator('button:has-text("Create Schema")').click();
    await expect(createDialog).not.toBeVisible();

    // Open schema popover and delete the schema
    const schemaButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: /public|Select schema/ });
    await schemaButton.click();

    const schemaItem = page
      .locator('[data-slot="popover-content"]')
      .locator(`div:has-text("${schemaName}")`)
      .first();
    await schemaItem.hover();

    const deleteButton = schemaItem.locator("button").nth(1);
    await deleteButton.click();

    // Check delete dialog state
    const deleteDialog = page
      .locator('[role="alertdialog"]')
      .filter({ hasText: "Delete Schema" });
    await expect(deleteDialog).toBeVisible();

    // The Delete button should be enabled initially
    const confirmDeleteButton = deleteDialog.locator(
      'button:has-text("Delete")',
    );
    await expect(confirmDeleteButton).toBeEnabled();

    // Cancel button should also be enabled
    const cancelButton = deleteDialog.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeEnabled();
  });
});
