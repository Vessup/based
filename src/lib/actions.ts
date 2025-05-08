"use server";

import {
  createSchema,
  deleteTable,
  deleteTableRows,
  getSchemas,
  getTableColumns,
  getTableData,
  getTables,
  insertTableRow,
  updateTableCell as dbUpdateTableCell,
} from "./db";

/**
 * Server action to fetch all database schemas
 */
export async function fetchDatabaseSchemas() {
  try {
    const schemas = await getSchemas();
    return { schemas, error: null };
  } catch (error) {
    console.error("Error fetching database schemas:", error);
    return { schemas: ['public'], error: "Failed to fetch database schemas" };
  }
}

/**
 * Server action to create a new database schema
 */
export async function createDatabaseSchema(schemaName: string) {
  try {
    const result = await createSchema(schemaName);
    return {
      success: result.success,
      message: result.message,
      error: null
    };
  } catch (error) {
    console.error(`Error creating schema ${schemaName}:`, error);
    return {
      success: false,
      message: `Failed to create schema ${schemaName}`,
      error: String(error)
    };
  }
}

/**
 * Server action to fetch all database tables from a specific schema
 */
export async function fetchDatabaseTables(schema = 'public') {
  try {
    const tables = await getTables(schema);
    return { tables, error: null };
  } catch (error) {
    console.error(`Error fetching database tables from schema ${schema}:`, error);
    return { tables: [], error: `Failed to fetch database tables from schema ${schema}` };
  }
}

/**
 * Server action to fetch table data with pagination
 */
export async function fetchTableData(
  tableName: string,
  page = 1,
  pageSize = 10,
) {
  try {
    const data = await getTableData(tableName, page, pageSize);
    const columns = await getTableColumns(tableName);

    return {
      data,
      columns,
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching data from table ${tableName}:`, error);
    return {
      data: {
        records: [],
        pagination: { total: 0, page, pageSize, pageCount: 0 },
      },
      columns: [],
      error: `Failed to fetch data from table ${tableName}`,
    };
  }
}

/**
 * Server action to update a cell value in a table
 */
export async function updateTableCell(tableName: string, rowId: string, columnName: string, value: unknown) {
  try {
    const result = await dbUpdateTableCell(tableName, rowId, columnName, value);
    return {
      success: result.success,
      message: result.message,
      error: null
    };
  } catch (error) {
    console.error(`Error updating cell in table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to update cell in table ${tableName}`,
      error: String(error)
    };
  }
}

/**
 * Server action to delete rows from a table
 */
export async function deleteRows(tableName: string, ids: string[]) {
  try {
    const result = await deleteTableRows(tableName, ids);
    return {
      success: result.success,
      message: result.message,
      deletedCount: result.deletedCount,
      error: null,
    };
  } catch (error) {
    console.error(`Error deleting rows from table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to delete rows from table ${tableName}`,
      deletedCount: 0,
      error: String(error),
    };
  }
}

/**
 * Server action to delete a table from the database
 */
export async function deleteTableAction(tableName: string) {
  try {
    const result = await deleteTable(tableName);
    return {
      success: result.success,
      message: result.message,
      error: null,
    };
  } catch (error) {
    console.error(`Error deleting table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to delete table ${tableName}`,
      error: String(error),
    };
  }
}

/**
 * Server action to add a new row to a table
 */
export async function addTableRow(tableName: string, data: Record<string, unknown>) {
  try {
    const result = await insertTableRow(tableName, data);
    return {
      success: result.success,
      message: result.message,
      record: result.record,
      error: null
    };
  } catch (error) {
    console.error(`Error adding row to table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to add row to table ${tableName}`,
      record: null,
      error: String(error)
    };
  }
}
