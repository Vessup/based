"use server";

import { getTables, getTableData, getTableColumns } from "./db";

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
export async function fetchTableData(tableName: string, page = 1, pageSize = 10) {
  try {
    const data = await getTableData(tableName, page, pageSize);
    const columns = await getTableColumns(tableName);

    return {
      data,
      columns,
      error: null
    };
  } catch (error) {
    console.error(`Error fetching data from table ${tableName}:`, error);
    return {
      data: { records: [], pagination: { total: 0, page, pageSize, pageCount: 0 } },
      columns: [],
      error: `Failed to fetch data from table ${tableName}`
    };
  }
}
