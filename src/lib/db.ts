import { SQL } from "bun";
import { config } from "./config";

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
 * Deletes a schema from the database
 * @param schemaName The name of the schema to delete
 * @returns Object containing success status and message
 */
export async function deleteSchema(schemaName: string) {
  try {
    // Prevent deletion of the public schema
    if (schemaName === "public") {
      return {
        success: false,
        message: "Cannot delete the 'public' schema",
      };
    }

    // Check if schema exists
    const schemaExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      ) AS exists;
    `;

    if (!schemaExists[0].exists) {
      return {
        success: false,
        message: `Schema '${schemaName}' does not exist`,
      };
    }

    // Drop the schema (CASCADE to drop all objects in the schema)
    await db`DROP SCHEMA ${db(schemaName)} CASCADE;`;

    return {
      success: true,
      message: `Schema '${schemaName}' deleted successfully`,
    };
  } catch (error) {
    console.error(`Error deleting schema ${schemaName}:`, error);
    return {
      success: false,
      message: `Failed to delete schema: ${error}`,
    };
  }
}

/**
 * Renames a schema in the database
 * @param oldName The current name of the schema
 * @param newName The new name for the schema
 * @returns Object containing success status and message
 */
export async function renameSchema(oldName: string, newName: string) {
  try {
    // Prevent renaming of the public schema
    if (oldName === "public") {
      return {
        success: false,
        message: "Cannot rename the 'public' schema",
      };
    }

    // Check if old schema exists
    const oldSchemaExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = ${oldName}
      ) AS exists;
    `;

    if (!oldSchemaExists[0].exists) {
      return {
        success: false,
        message: `Schema '${oldName}' does not exist`,
      };
    }

    // Check if new schema name already exists
    const newSchemaExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = ${newName}
      ) AS exists;
    `;

    if (newSchemaExists[0].exists) {
      return {
        success: false,
        message: `Schema '${newName}' already exists`,
      };
    }

    // Rename the schema
    await db`ALTER SCHEMA ${db(oldName)} RENAME TO ${db(newName)};`;

    return {
      success: true,
      message: `Schema renamed from '${oldName}' to '${newName}' successfully`,
    };
  } catch (error) {
    console.error(
      `Error renaming schema from ${oldName} to ${newName}:`,
      error,
    );
    return {
      success: false,
      message: `Failed to rename schema: ${error}`,
    };
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
    // Enhanced query to include foreign key info
    const result = await db`
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        fk_info.foreign_table_name,
        fk_info.foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.table_name = ${tableName}
          AND kcu.table_schema = 'public'
      ) AS fk_info
      ON c.column_name = fk_info.column_name
      WHERE c.table_name = ${tableName}
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position;
    `;

    return result;
  } catch (error) {
    console.error(`Error fetching columns for table ${tableName}:`, error);
    return [];
  }
}

/**
 * Fetches records from a specific table with pagination and sorting
 * @param tableName The name of the table to query
 * @param page The page number (1-based)
 * @param pageSize The number of records per page
 * @param sortColumn The column to sort by (optional)
 * @param sortDirection The sort direction: 'asc' or 'desc' (optional)
 * @returns Object containing records and pagination info
 */
export async function getTableData(
  tableName: string,
  page = 1,
  pageSize = 10,
  sortColumn?: string,
  sortDirection?: "asc" | "desc",
) {
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

    // Build the base query
    let query: string;

    if (sortColumn && sortDirection) {
      // Validate sort direction - safer approach without db.unsafe()
      const direction = sortDirection.toLowerCase() === "desc" ? "DESC" : "ASC";

      // Validate that sortColumn exists in the table to prevent SQL errors
      const columns = await getTableColumns(tableName);
      const validColumn = columns.find((c) => c.column_name === sortColumn);
      if (!validColumn) {
        console.warn(`Invalid sort column: ${sortColumn}`);
        // Fall back to query without sorting
        query = await db`
          SELECT *
          FROM ${db(tableName)}
          LIMIT ${pageSize}
          OFFSET ${offset}
        `;
      } else {
        // Get records with pagination and sorting - use template literal for direction
        if (direction === "DESC") {
          query = await db`
            SELECT *
            FROM ${db(tableName)}
            ORDER BY ${db(sortColumn)} DESC
            LIMIT ${pageSize}
            OFFSET ${offset}
          `;
        } else {
          query = await db`
            SELECT *
            FROM ${db(tableName)}
            ORDER BY ${db(sortColumn)} ASC
            LIMIT ${pageSize}
            OFFSET ${offset}
          `;
        }
      }
    } else {
      // Get records with pagination only
      query = await db`
        SELECT *
        FROM ${db(tableName)}
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;
    }

    return {
      records: query,
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
 * Renames a table in the database
 * @param oldTableName The current name of the table
 * @param newTableName The new name for the table
 * @returns Object containing success status and message
 */
export async function renameTable(oldTableName: string, newTableName: string) {
  try {
    // First, verify the old table exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${oldTableName}
      ) AS exists;
    `;

    if (!tableExists[0].exists) {
      return {
        success: false,
        message: `Table '${oldTableName}' does not exist`,
      };
    }

    // Check if new table name already exists
    const newTableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${newTableName}
      ) AS exists;
    `;

    if (newTableExists[0].exists) {
      return {
        success: false,
        message: `Table '${newTableName}' already exists`,
      };
    }

    // Execute the rename operation
    console.log(`Renaming table: ${oldTableName} to ${newTableName}`);
    await db`ALTER TABLE ${db(oldTableName)} RENAME TO ${db(newTableName)};`;

    return {
      success: true,
      message: `Successfully renamed table '${oldTableName}' to '${newTableName}'`,
    };
  } catch (error) {
    console.error(`Error renaming table ${oldTableName}:`, error);
    return {
      success: false,
      message: `Failed to rename table: ${error}`,
    };
  }
}

/**
 * Creates a new table in the database
 * @param schemaName The schema where the table will be created
 * @param tableName The name of the new table
 * @returns Object containing success status and message
 */
export async function createTable(schemaName: string, tableName: string) {
  try {
    // Check if table already exists
    const tableExists = await db`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = ${schemaName}
        AND table_name = ${tableName}
      ) AS exists;
    `;

    if (tableExists[0].exists) {
      return {
        success: false,
        message: `Table '${tableName}' already exists in schema '${schemaName}'`,
      };
    }

    // Create the table with a basic structure
    await db.unsafe(`
      CREATE TABLE "${schemaName}"."${tableName}" (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return {
      success: true,
      message: `Table '${tableName}' created successfully in schema '${schemaName}'`,
    };
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to create table: ${error}`,
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

/**
 * Validates column data against table schema
 * @param tableName The name of the table
 * @param data The data to validate
 * @returns Object containing validation result
 */
async function validateColumnData(
  tableName: string,
  data: Record<string, unknown>,
) {
  try {
    // Get table columns with their constraints
    const columns = await db`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = ${tableName};
    `;

    const errors: string[] = [];

    for (const [columnName, value] of Object.entries(data)) {
      const column = columns.find(
        (col: {
          column_name: string;
          data_type: string;
          is_nullable: string;
          character_maximum_length?: number;
        }) => col.column_name === columnName,
      );

      if (!column) {
        errors.push(
          `Column '${columnName}' does not exist in table '${tableName}'`,
        );
        continue;
      }

      // Check nullable constraints
      if (
        column.is_nullable === "NO" &&
        (value === null || value === undefined || value === "")
      ) {
        errors.push(`Column '${columnName}' cannot be null`);
        continue;
      }

      // Skip further validation for null values if column is nullable
      if (value === null || value === undefined || value === "") {
        continue;
      }

      // Basic type validation
      const dataType = column.data_type.toLowerCase();
      const valueType = typeof value;

      if (
        dataType.includes("int") &&
        valueType !== "number" &&
        valueType !== "string"
      ) {
        errors.push(
          `Column '${columnName}' expects a number, got ${valueType}`,
        );
      } else if (
        dataType.includes("bool") &&
        valueType !== "boolean" &&
        valueType !== "string"
      ) {
        errors.push(
          `Column '${columnName}' expects a boolean, got ${valueType}`,
        );
      } else if (dataType.includes("char") || dataType.includes("text")) {
        // Check length constraints for string columns
        if (column.character_maximum_length && typeof value === "string") {
          if (value.length > column.character_maximum_length) {
            errors.push(
              `Column '${columnName}' value exceeds maximum length of ${column.character_maximum_length}`,
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error(
      `Error validating column data for table ${tableName}:`,
      error,
    );
    return {
      isValid: false,
      errors: [`Validation error: ${error}`],
    };
  }
}

/**
 * Updates multiple rows in a table with bulk operations using a transaction
 * @param tableName The name of the table
 * @param updates Array of updates containing row ID and data changes
 * @returns Object containing success status and message
 */
export async function bulkUpdateTableRows(
  tableName: string,
  updates: Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
) {
  try {
    if (!updates.length) {
      return {
        success: false,
        message: "No updates provided",
      };
    }

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
    } else {
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

    // Validate all data before proceeding
    for (const update of updates) {
      const validation = await validateColumnData(tableName, update.data);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(", ")}`,
        };
      }
    }

    // Group updates by columns being changed for efficiency
    const columnUpdates = new Map<
      string,
      Array<{ id: string; value: unknown }>
    >();

    for (const update of updates) {
      for (const [columnName, value] of Object.entries(update.data)) {
        if (!columnUpdates.has(columnName)) {
          columnUpdates.set(columnName, []);
        }
        const columnList = columnUpdates.get(columnName);
        if (columnList) {
          columnList.push({ id: update.id, value });
        }
      }
    }

    // Use a transaction to ensure atomicity
    await db.begin(async (sql) => {
      for (const [columnName, columnData] of columnUpdates) {
        // Build a bulk UPDATE using CASE statements for efficiency
        // This updates all rows for a single column in one query
        const ids = columnData.map((item) => item.id);
        const values = columnData.map((item) => item.value);

        // Create CASE statement for bulk update
        let caseStatement = `CASE "${primaryKeyColumn}"`;
        const params: unknown[] = [];

        for (let i = 0; i < columnData.length; i++) {
          caseStatement += ` WHEN $${params.length + 1} THEN $${params.length + 2}`;
          params.push(columnData[i].id);
          params.push(columnData[i].value === "" ? null : columnData[i].value);
        }
        caseStatement += ` ELSE "${columnName}" END`;

        // Execute the bulk update for this column
        await sql.unsafe(
          `
          UPDATE "${tableName}"
          SET "${columnName}" = ${caseStatement}
          WHERE "${primaryKeyColumn}" IN (${ids.map((_, i) => `$${params.length + 1 + i}`).join(", ")})
        `,
          [...params, ...ids],
        );
      }
    });

    return {
      success: true,
      message: `Successfully updated ${updates.length} row(s) in table '${tableName}'`,
    };
  } catch (error) {
    console.error(`Error bulk updating rows in table ${tableName}:`, error);
    return {
      success: false,
      message: `Failed to update rows: ${error}`,
    };
  }
}

/**
 * Executes a custom SQL query safely
 * @param query The SQL query to execute
 * @returns Object containing query results or error
 */
export async function executeCustomQuery(query: string) {
  try {
    if (!query.trim()) {
      return {
        success: false,
        message: "Query cannot be empty",
        results: [],
        columns: [],
      };
    }

    // Prevent dangerous operations - basic protection
    const dangerousKeywords = [
      "DROP",
      "DELETE",
      "UPDATE",
      "INSERT",
      "CREATE",
      "ALTER",
      "TRUNCATE",
      "GRANT",
      "REVOKE",
    ];

    const upperQuery = query.toUpperCase().trim();
    const isDangerous = dangerousKeywords.some(
      (keyword) =>
        upperQuery.startsWith(`${keyword} `) ||
        upperQuery.includes(` ${keyword} `) ||
        upperQuery.endsWith(` ${keyword}`),
    );

    if (isDangerous) {
      return {
        success: false,
        message: "Only SELECT queries are allowed for security reasons",
        results: [],
        columns: [],
      };
    }

    // Execute the query using db.unsafe for custom SQL
    const result = await db.unsafe(query);

    // Extract column information from the first row if available
    let columns: Array<{ key: string; name: string; type: string }> = [];
    if (result.length > 0) {
      const firstRow = result[0];
      columns = Object.keys(firstRow).map((key) => ({
        key,
        name: key,
        type:
          typeof firstRow[key] === "number"
            ? "number"
            : typeof firstRow[key] === "boolean"
              ? "boolean"
              : firstRow[key] instanceof Date
                ? "date"
                : "string",
      }));
    }

    // Serialize Date objects to avoid React rendering errors
    const serializedResults = result.map((row) => {
      const serializedRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          serializedRow[key] = value.toISOString();
        } else {
          serializedRow[key] = value;
        }
      }
      return serializedRow;
    });

    return {
      success: true,
      message: `Query executed successfully. ${result.length} rows returned.`,
      results: serializedResults,
      columns,
      rowCount: result.length,
    };
  } catch (error) {
    console.error("Error executing custom query:", error);
    return {
      success: false,
      message: `Query execution failed: ${error}`,
      results: [],
      columns: [],
    };
  }
}

/**
 * Checks if the database connection is healthy
 * @returns Object containing connection status and information
 */
export async function checkDatabaseHealth() {
  try {
    // Simple connectivity test
    const result =
      await db`SELECT NOW() as server_time, version() as server_version`;

    return {
      connected: true,
      serverTime: result[0]?.server_time,
      serverVersion: result[0]?.server_version,
      message: "Database connection is healthy",
    };
  } catch (error) {
    console.error("Database health check failed:", error);
    return {
      connected: false,
      serverTime: null,
      serverVersion: null,
      message: `Database connection failed: ${error}`,
    };
  }
}

/**
 * Tests database connection with custom configuration
 * @param customConfig Custom database configuration
 * @returns Object containing connection status and information
 */
export async function testDatabaseConnection(customConfig: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  let testConnection: SQL | null = null;
  try {
    // Create a temporary connection with custom config
    testConnection = new SQL(customConfig);

    // Test the connection
    const result =
      await testConnection`SELECT NOW() as server_time, version() as server_version`;

    return {
      connected: true,
      serverTime: result[0]?.server_time,
      serverVersion: result[0]?.server_version,
      message: "Database connection is healthy",
    };
  } catch (error) {
    console.error("Test database connection failed:", error);
    return {
      connected: false,
      serverTime: null,
      serverVersion: null,
      message: `Database connection failed: ${error}`,
    };
  } finally {
    // Always close the test connection
    if (testConnection) {
      try {
        testConnection.close();
      } catch (closeError) {
        console.warn("Error closing test connection:", closeError);
      }
    }
  }
}

/**
 * Creates a temporary connection for custom operations
 * @param customConfig Custom database configuration
 * @returns SQL instance or null if connection failed
 */
async function createTempConnection(customConfig: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  try {
    return new SQL(customConfig);
  } catch (error) {
    console.error("Failed to create temporary connection:", error);
    return null;
  }
}

/**
 * Gets performance-focused database statistics for developers
 * @param customConfig Optional custom database configuration
 * @returns Object containing performance metrics and statistics
 */
export async function getDatabaseStats(customConfig?: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  let connection = db;
  let shouldCloseConnection = false;

  try {
    // Use custom connection if provided
    if (customConfig) {
      const tempConnection = await createTempConnection(customConfig);
      if (!tempConnection) {
        throw new Error("Failed to create connection with custom config");
      }
      connection = tempConnection;
      shouldCloseConnection = true;
    }

    // Execute all queries in parallel using Promise.allSettled for resilience
    const results = await Promise.allSettled([
      // Cache hit ratio (should be >95% in dev)
      connection`
        SELECT round(blks_hit*100.0/(blks_hit+blks_read), 2) as cache_hit_ratio
        FROM pg_stat_database WHERE datname = current_database();
      `,

      // Active connections
      connection`
        SELECT count(*) as active_connections
        FROM pg_stat_activity WHERE state = 'active';
      `,

      // Database size
      connection`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;
      `,

      // Table activity (most active tables)
      connection`
        SELECT tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch,
               n_tup_ins, n_tup_upd, n_tup_del
        FROM pg_stat_user_tables
        ORDER BY seq_scan + idx_scan DESC
        LIMIT 5;
      `,

      // Table sizes (largest tables in public schema)
      connection`
        SELECT tablename,
               pg_size_pretty(pg_relation_size(tablename::regclass)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(tablename::regclass) DESC
        LIMIT 5;
      `,

      // Missing indexes (tables with high seq_scan/seq_tup_read ratio)
      connection`
        SELECT tablename, seq_scan, seq_tup_read,
               CASE WHEN seq_scan > 0 THEN round(seq_tup_read::numeric/seq_scan, 2) ELSE 0 END as avg_seq_read
        FROM pg_stat_user_tables
        WHERE seq_scan > 0
        ORDER BY seq_tup_read DESC
        LIMIT 5;
      `,

      // Unused indexes
      connection`
        SELECT tablename, indexname, idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        LIMIT 5;
      `,

      // Slow/long-running queries
      connection`
        SELECT query, state, query_start,
               EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds
        FROM pg_stat_activity
        WHERE state = 'active' AND now() - query_start > interval '1 second'
        LIMIT 5;
      `,
    ]);

    return {
      success: true,
      cacheHitRatio:
        results[0].status === "fulfilled"
          ? results[0].value[0]?.cache_hit_ratio
          : null,
      activeConnections:
        results[1].status === "fulfilled"
          ? Number(results[1].value[0]?.active_connections)
          : null,
      databaseSize:
        results[2].status === "fulfilled"
          ? results[2].value[0]?.database_size
          : "Error",
      tableActivity: results[3].status === "fulfilled" ? results[3].value : [],
      tableSizes: results[4].status === "fulfilled" ? results[4].value : [],
      missingIndexes: results[5].status === "fulfilled" ? results[5].value : [],
      unusedIndexes: results[6].status === "fulfilled" ? results[6].value : [],
      slowQueries: results[7].status === "fulfilled" ? results[7].value : [],
    };
  } catch (error) {
    console.error("Error fetching database stats:", error);
    return {
      success: false,
      cacheHitRatio: null,
      activeConnections: null,
      databaseSize: "Unknown",
      tableActivity: [],
      tableSizes: [],
      missingIndexes: [],
      unusedIndexes: [],
      slowQueries: [],
      error: `Failed to fetch database stats: ${error}`,
    };
  } finally {
    // Close temporary connection if created
    if (shouldCloseConnection && connection) {
      try {
        connection.close();
      } catch (closeError) {
        console.warn("Error closing temporary connection:", closeError);
      }
    }
  }
}
