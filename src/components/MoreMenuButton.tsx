import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import React from "react";
import type { Column } from "react-data-grid";

interface MoreMenuButtonProps {
  selectedRows: Set<string>;
  data: Record<string, unknown>[];
  columns: Column<Record<string, unknown>>[];
}

function escapeValue(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "boolean")
    return value.toString();
  // Escape single quotes for SQL
  return `'${String(value).replace(/'/g, "''")}'`;
}

function generateInsertSQL(
  tableName: string,
  columns: Column<Record<string, unknown>>[],
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return "";
  const colNames = columns
    .filter(
      (col) =>
        col.key !== "select-row" &&
        col.key !== "rdg-select-row" &&
        col.key !== "rdg-select-column",
    )
    .map((col) => col.key);
  const values = rows.map(
    (row) => `(${colNames.map((col) => escapeValue(row[col])).join(", ")})`,
  );
  return `INSERT INTO \"${tableName}\" (${colNames.map((c) => `\"${c}\"`).join(", ")}) VALUES\n${values.join(",\n")};`;
}

export const MoreMenuButton: React.FC<MoreMenuButtonProps> = ({
  selectedRows,
  data,
  columns,
}) => {
  // Try to infer table name from columns if possible, else fallback
  const tableName = React.useMemo(() => {
    // TODO: Pass tableName as a prop for accuracy
    return "table";
  }, []);

  const selectedData = React.useMemo(
    () => data.filter((row) => selectedRows.has(String(row.id))),
    [data, selectedRows],
  );

  const handleCopySQL = React.useCallback(() => {
    const sql = generateInsertSQL(tableName, columns, selectedData);
    if (sql) {
      navigator.clipboard.writeText(sql);
    }
  }, [tableName, columns, selectedData]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span>
          <Button
            variant="outline"
            size="icon"
            disabled={selectedRows.size === 0}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleCopySQL}
          disabled={selectedRows.size === 0}
        >
          Copy as SQL INSERT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
