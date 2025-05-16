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
if (process.env.NODE_ENV !== "production") {
  // Handle cleanup in development mode
  process.on("SIGTERM", () => {
    console.log("Closing database connection due to SIGTERM");
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      global.dbGlobal = undefined;
    }
  });

  process.on("SIGINT", () => {
    console.log("Closing database connection due to SIGINT");
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      global.dbGlobal = undefined;
    }
    process.exit(0);
  });
}

/**
 * Creates a new schema in the database
 * @param schemaName The name of the schema to create
 * @returns Object containing success status and message
 */
export async function createSchema(schemaName: string) {
  try {
    // Check if schema already exists
    const schemaExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      ) AS exists;
    `;

    if (schemaExists[0].exists) {
      return {
        success: false,
        message: `Schema '${schemaName}' already exists`,
      };
    }

    // Create the schema
    await db`CREATE SCHEMA ${db(schemaName)};`;

    return {
      success: true,
      message: `Successfully created schema '${schemaName}'`,
    };
  } catch (error) {
    console.error(`Error creating schema ${schemaName}:`, error);
    return {
      success: false,
      message: `Failed to create schema: ${error}`,
    };
  }
}

/**
 * Fetches all available schemas in the database
 * @returns Array of schema names
 */
export async function getSchemas() {
  try {
    // Query the PostgreSQL information_schema to get all schemas
    // Filtering out system schemas
    const result = await db`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT LIKE 'pg_%'
      AND schema_name != 'information_schema'
      ORDER BY schema_name;
    `;

    // Extract schema names from the result
    return result.map((row: { schema_name: string }) => row.schema_name);
  } catch (error) {
    console.error("Error fetching database schemas:", error);
    return ["public"]; // Default to public schema if there's an error
  }
}

/**
 * Fetches all table names from the specified schema
 * @param schema The database schema to fetch tables from
 * @returns Array of table names
 */
export async function getTables(schema = "public") {
  try {
    // Query the PostgreSQL information_schema to get all tables in the specified schema
    const result = await db`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schema}
      ORDER BY table_name;
    `;

    // Extract table names from the result
    return result.map((row: { table_name: string }) => row.table_name);
  } catch (error) {
    console.error(`Error fetching tables from schema ${schema}:`, error);
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
      },
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
      },
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

    // First, verify the table exists and get its columns
    // Note: We need to be careful with table names that are reserved keywords
    console.log(`Checking columns for table: ${tableName}`);
    const tableColumns = await db`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName};
    `;

    if (tableColumns.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        message: `Table '${tableName}' does not exist or has no columns`,
      };
    }

    // Get column names as an array for easier checking
    const columnNames = tableColumns.map(
      (col: { column_name: string }) => col.column_name,
    );
    console.log(`Available columns in table ${tableName}:`, columnNames);

    // Determine the primary key column
    const primaryKeyResult = await db`
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = ${tableName}::regclass
      AND i.indisprimary;
    `;

    // If no primary key is found, try common ID column names
    let primaryKeyColumn: string;
    if (primaryKeyResult.length > 0) {
      primaryKeyColumn = primaryKeyResult[0].column_name;
      console.log(`Found primary key column: ${primaryKeyColumn}`);
    } else {
      // Try common ID column names, but verify they exist in the table
      const commonIdColumns = ["id", "ID", "uuid", "UUID"];
      const foundColumn = commonIdColumns.find((col) =>
        columnNames.includes(col),
      );

      if (!foundColumn) {
        return {
          success: false,
          deletedCount: 0,
          message: `Could not determine primary key column for table '${tableName}'`,
        };
      }
      primaryKeyColumn = foundColumn;
      console.log(`Using common ID column: ${primaryKeyColumn}`);
    }

    // Verify the primary key column exists in the table
    if (!columnNames.includes(primaryKeyColumn)) {
      return {
        success: false,
        deletedCount: 0,
        message: `Primary key column '${primaryKeyColumn}' does not exist in table '${tableName}'`,
      };
    }

    // Ensure ids is a flat array of scalars (not objects/arrays)
    const scalarIds = ids.map((id) => {
      if (typeof id === "object" && id !== null && primaryKeyColumn in id) {
        return id[primaryKeyColumn];
      }
      return id;
    });

    // Execute the delete operation
    console.log(
      `Deleting from table ${tableName} where ${primaryKeyColumn} IN (${scalarIds.join(", ")})`,
    );

    let result: Array<Record<string, unknown>>;
    if (scalarIds.length === 1) {
      result = await db`
        DELETE FROM ${db(tableName)}
        WHERE ${db(primaryKeyColumn)} = ${scalarIds[0]}
        RETURNING ${db(primaryKeyColumn)};
      `;
    } else {
      result = await db`
        DELETE FROM ${db(tableName)}
        WHERE ${db(primaryKeyColumn)} IN ${db(scalarIds)}
        RETURNING ${db(primaryKeyColumn)};
      `;
    }

    return {
      success: true,
      deletedCount: result.length,
      message: `Successfully deleted ${result.length} records`,
    };
  } catch (error) {
    console.error(`Error deleting rows from table ${tableName}:`, error);
    return {
      success: false,
      deletedCount: 0,
      message: `Failed to delete rows: ${error}`,
    };
  }
}

/**
 * Deletes a table from the database
 * @param tableName The name of the table to delete
 * @returns Object containing success status and message
 */
export async function deleteTable(tableName: string) {
  try {
    // First, verify the table exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) AS exists;
    `;

    if (!tableExists[0].exists) {
      return {
        success: false,
        message: `Table '${tableName}' does not exist`,
      };
    }

    // Execute the drop table operation
    console.log(`Dropping table: ${tableName}`);
    await db`DROP TABLE ${db(tableName)} CASCADE;`;

    return {
      success: true,
      message: `Successfully deleted table '${tableName}'`,
    };
  } catch (error) {
    console.error(`Error deleting table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to delete table: ${error}`,
    };
  }
}

/**
 * Inserts a new row into a table
 * @param tableName The name of the table
 * @param data Object containing column names and values for the new row
 * @returns Object containing success status and message
 */
export async function insertTableRow(
  tableName: string,
  data: Record<string, unknown>,
) {
  try {
    // First, verify the table exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) AS exists;
    `;

    if (!tableExists[0].exists) {
      return {
        success: false,
        message: `Table '${tableName}' does not exist`,
      };
    }

    // Get the column names for the table
    const columns = await db`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName};
    `;

    // Filter out columns that aren't in the provided data
    const columnNames = Object.keys(data);
    type Column = { column_name: string; data_type: string };
    const validColumns = (columns as Column[]).filter((col: Column) =>
      columnNames.includes(col.column_name),
    );

    if (validColumns.length === 0) {
      return {
        success: false,
        message: `No valid columns provided for table '${tableName}'`,
      };
    }

    // Prepare column names and values for the INSERT query
    const insertColumns = validColumns.map((col: Column) => col.column_name);
    const insertValues = validColumns.map(
      (col: Column) => data[col.column_name],
    );

    // Execute the insert operation
    console.log(`Inserting into table ${tableName}:`, data);

    // Create an object with column names as keys and values as values
    const insertData: Record<string, unknown> = {};
    for (const col of validColumns) {
      insertData[col.column_name] = data[col.column_name];
    }

    // Use the SQL library's object insertion feature
    const result = await db`
      INSERT INTO ${db(tableName)} ${db(insertData)}
      RETURNING *;
    `;

    return {
      success: true,
      message: "Successfully added new record",
      record: result[0],
    };
  } catch (error) {
    console.error(`Error inserting row into table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to insert row: ${error}`,
    };
  }
}

/**
 * Updates a cell value in a table
 * @param tableName The name of the table
 * @param rowId The ID of the row to update
 * @param columnName The name of the column to update
 * @param value The new value for the cell
 * @returns Object containing success status and message
 */
export async function updateTableCell(
  tableName: string,
  rowId: string,
  columnName: string,
  value: unknown,
) {
  try {
    // First, verify the table exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) AS exists;
    `;

    if (!tableExists[0].exists) {
      return {
        success: false,
        message: `Table '${tableName}' does not exist`,
      };
    }

    // Determine the primary key column
    const primaryKeyResult = await db`
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = ${tableName}::regclass
      AND i.indisprimary;
    `;

    // If no primary key is found, try common ID column names
    let primaryKeyColumn: string;
    if (primaryKeyResult.length > 0) {
      primaryKeyColumn = primaryKeyResult[0].column_name;
      console.log(`Found primary key column: ${primaryKeyColumn}`);
    } else {
      // Try common ID column names
      const columnResult = await db`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ${tableName};
      `;

      const columnNames = columnResult.map(
        (col: { column_name: string }) => col.column_name,
      );
      const commonIdColumns = ["id", "ID", "uuid", "UUID"];
      const foundColumn = commonIdColumns.find((col) =>
        columnNames.includes(col),
      );

      if (!foundColumn) {
        return {
          success: false,
          message: `Could not determine primary key column for table '${tableName}'`,
        };
      }
      primaryKeyColumn = foundColumn;
    }

    // Execute the update operation
    console.log(
      `Updating table ${tableName} where ${primaryKeyColumn} = ${rowId}, setting ${columnName} = ${value}`,
    );

    // Handle null values
    if (value === null || value === "") {
      await db`
        UPDATE ${db(tableName)}
        SET ${db(columnName)} = NULL
        WHERE ${db(primaryKeyColumn)} = ${rowId}
      `;
    } else {
      await db`
        UPDATE ${db(tableName)}
        SET ${db(columnName)} = ${value}
        WHERE ${db(primaryKeyColumn)} = ${rowId}
      `;
    }

    return {
      success: true,
      message: "Successfully updated cell",
    };
  } catch (error) {
    console.error(`Error updating cell in table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to update cell: ${error}`,
    };
  }
}
