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
