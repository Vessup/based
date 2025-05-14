import { DataGrid, type Column } from "react-data-grid";
import clsx from "clsx";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import "react-data-grid/lib/styles.css";
import { Checkbox } from "@/components/ui/checkbox";
import type { RenderCheckboxProps } from "react-data-grid";

// Custom CSS to hide outline for header and checkbox cells
const customGridStyles = `
  .rdg-header-cell:focus-visible,
  .rdg-header-cell:focus {
    outline: none !important;
    box-shadow: none !important;
  }
  .rdg-cell.rdg-checkbox-cell:focus-visible,
  .rdg-cell.rdg-checkbox-cell:focus {
    outline: none !important;
    box-shadow: none !important;
  }
`;

interface TableDataGridProps {
  columns: Column<Record<string, unknown>>[];
  data: Record<string, unknown>[];
  selectedRows: Set<string>;
  onSelectedRowsChange: (selectedRows: Set<string>) => void;
  onRowsChange: (
    newRows: Record<string, unknown>[],
    args: { indexes: number[]; column: { key: string } }
  ) => void;
  pagination: { total: number };
  onRefresh: () => void;
  onAddRecord: () => void;
  onDeleteSelected: () => void;
  refreshing: boolean;
  isDeleting: boolean;
}

export function TableDataGrid({
  columns,
  data,
  selectedRows,
  onSelectedRowsChange,
  onRowsChange,
  pagination,
  onRefresh,
  onAddRecord,
  onDeleteSelected,
  refreshing,
  isDeleting,
}: TableDataGridProps) {
  const { theme } = useTheme();

  // Enhance columns to add cellClass/headerCellClass for outline control
  const enhancedColumns = columns.map((col) => {
    // Checkbox column (SelectColumn) is usually identified by key 'select-row' or similar
    const isCheckbox = col.key === 'select-row' || col.key === 'rdg-select-row' || col.key === 'rdg-select-column';
    return {
      ...col,
      cellClass: clsx(col.cellClass, isCheckbox && 'rdg-checkbox-cell'),
      headerCellClass: clsx(col.headerCellClass, 'rdg-header-cell'),
    };
  });

  return (
    <>
      <style>{customGridStyles}</style>
      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button onClick={onAddRecord} size="sm">
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
        {selectedRows.size > 0 && (
          <Button
            onClick={onDeleteSelected}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting
              ? "Deleting..."
              : `Delete Selected (${selectedRows.size})`}
          </Button>
        )}
      </div>
      <DataGrid
        columns={enhancedColumns}
        rows={data}
        rowKeyGetter={(row: Record<string, unknown>) => String(row.id)}
        selectedRows={selectedRows}
        onSelectedRowsChange={onSelectedRowsChange}
        onRowsChange={onRowsChange}
        renderers={{
          renderCheckbox: ({ onChange, ...props }: RenderCheckboxProps) => (
            <Checkbox
              {...props}
              onCheckedChange={(checked) => onChange(!!checked, false)}
            />
          )
        }}
        className={clsx(
          theme === "light" && "rdg-light",
          "rounded-lg mt-4 flex-auto"
        )}
      />
      <div className="my-4 text-sm text-muted-foreground">
        Showing {data.length} of {pagination.total} records
      </div>
      <Toaster position="bottom-right" richColors />
    </>
  );
} 