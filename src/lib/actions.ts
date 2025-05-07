"use server";

import {
  deleteTable,
  deleteTableRows,
  getTableColumns,
  getTableData,
  getTables,
} from "./db";

/**
 * Server action to fetch all database tables
 */
export async function fetchDatabaseTables() {
  try {
    const tables = await getTables();
    return { tables, error: null };
  } catch (error) {
    console.error("Error fetching database tables:", error);
    return { tables: [], error: "Failed to fetch database tables" };
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
