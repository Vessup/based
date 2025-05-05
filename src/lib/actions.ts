"use server"

import { getTables } from "./db";

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
