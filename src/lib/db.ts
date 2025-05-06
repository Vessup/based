import "dotenv/config";
import { SQL } from "bun";

export const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "based",
};

// Singleton pattern to prevent multiple connections during hot module replacement
let dbInstance: SQL | null = null;

// Use global variable to persist connection across hot reloads
declare global {
  var dbGlobal: SQL | undefined;
}

// Get or create the database connection
function getDbConnection() {
  // Check if we already have an instance in the module
  if (dbInstance) {
    return dbInstance;
  }

  // Check if we have an instance in the global object (persists across hot reloads)
  if (global.dbGlobal) {
    dbInstance = global.dbGlobal;
    return dbInstance;
  }

  // Create a new instance if none exists
  console.log("Creating new database connection");
  dbInstance = new SQL(config);
  global.dbGlobal = dbInstance;

  return dbInstance;
}

// Export the database connection
export const db = getDbConnection();

// Add cleanup for the database connection
if (process.env.NODE_ENV !== 'production') {
  // Handle cleanup in development mode
  process.on('SIGTERM', () => {
    console.log('Closing database connection due to SIGTERM');
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      global.dbGlobal = undefined;
    }
  });

  process.on('SIGINT', () => {
    console.log('Closing database connection due to SIGINT');
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      global.dbGlobal = undefined;
    }
    process.exit(0);
  });
}

/**
 * Fetches all table names from the current database
 * @returns Array of table names
 */
export async function getTables() {
  try {
    // Query the PostgreSQL information_schema to get all tables in the current database
    // Filtering out system tables (pg_* and information_schema)
    const result = await db`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    // Extract table names from the result
    return result.map((row: { table_name: string }) => row.table_name);
  } catch (error) {
    console.error("Error fetching database tables:", error);
    return [];
  }
}

/**
 * Fetches the column information for a specific table
 * @param tableName The name of the table to get columns for
 * @returns Array of column information objects
 */
export async function getTableColumns(tableName: string) {
  try {
    // Using tagged template literals for safe parameter passing
    const result = await db`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `;

    return result;
  } catch (error) {
    console.error(`Error fetching columns for table ${tableName}:`, error);
    return [];
  }
}

/**
 * Fetches records from a specific table with pagination
 * @param tableName The name of the table to query
 * @param page The page number (1-based)
 * @param pageSize The number of records per page
 * @returns Object containing records and pagination info
 */
export async function getTableData(tableName: string, page = 1, pageSize = 10) {
  try {
    // Calculate offset
    const offset = (page - 1) * pageSize;

    // For dynamic table names, we need to use a different approach
    // Using the tagged template literal syntax but with dynamic table name
    // This is safer than string concatenation
    const countResult = await db`
      SELECT COUNT(*) as total
      FROM ${db(tableName)}
    `;

    const total = Number(countResult[0].total);

    // Get records with pagination
    const records = await db`
      SELECT *
      FROM ${db(tableName)}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    return {
      records,
      pagination: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      }
    };
  } catch (error) {
    console.error(`Error fetching data from table ${tableName}:`, error);
    return {
      records: [],
      pagination: {
        total: 0,
        page,
        pageSize,
        pageCount: 0,
      }
    };
  }
}

/**
 * Deletes records from a specific table by their IDs
 * @param tableName The name of the table to delete from
 * @param ids Array of IDs to delete
 * @returns Object containing success status and number of deleted records
 */
export async function deleteTableRows(tableName: string, ids: string[]) {
  try {
    if (!ids.length) {
      return { success: false, deletedCount: 0, message: "No IDs provided" };
    }

    // Determine the primary key column
    const primaryKeyResult = await db`
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = ${db(tableName)}::regclass
      AND i.indisprimary;
    `;

    // If no primary key is found, try common ID column names
    const primaryKeyColumn = primaryKeyResult.length > 0
      ? primaryKeyResult[0].column_name
      : 'id'; // Default to 'id' if no primary key found

    // Execute the delete operation
    const result = await db`
      DELETE FROM ${db(tableName)}
      WHERE ${db(primaryKeyColumn)} IN ${db(ids)}
      RETURNING ${db(primaryKeyColumn)};
    `;

    return {
      success: true,
      deletedCount: result.length,
      message: `Successfully deleted ${result.length} records`
    };
  } catch (error) {
    console.error(`Error deleting rows from table ${tableName}:`, error);
    return {
      success: false,
      deletedCount: 0,
      message: `Failed to delete rows: ${error}`
    };
  }
}
