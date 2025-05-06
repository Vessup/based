import "dotenv/config";
import { SQL } from "bun";

export const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "based",
};

export const db = new SQL(config);

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
      FROM ${db.unsafe(`"${tableName}"`)}
    `;

    const total = Number(countResult[0].total);

    // Get records with pagination
    const records = await db`
      SELECT *
      FROM ${db.unsafe(`"${tableName}"`)}
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
