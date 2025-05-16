import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { Plus, RefreshCw, Trash2, MoreHorizontal } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { type Column, DataGrid } from "react-data-grid";
import { Toaster } from "sonner";
import "react-data-grid/lib/styles.css";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { RenderCheckboxProps } from "react-data-grid";
import { MoreMenuButton } from "./MoreMenuButton";

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
    args: { indexes: number[]; column: { key: string } },
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

  // Custom context menu open state and position for data cells
  const [contextMenuState, setContextMenuState] = React.useState<{
    top: number;
    left: number;
    value: string;
  } | null>(null);

  const [contextMenuValue, setContextMenuValue] = React.useState<string>("");

  const gridRef = React.useRef<HTMLDivElement>(null);

  // Handler for right-click on a cell
  const handleCellContextMenu = React.useCallback(
    (
      args: {
        row: Record<string, unknown> | undefined;
        column: { key: string };
      },
      event: React.MouseEvent,
    ) => {
      // Only handle data cells
      const checkboxKeys = ["select-row", "rdg-select-row", "rdg-select-column"];
      if (!args.row) return;
      if (checkboxKeys.includes(args.column.key)) return;

      // Only for data cells: prevent default to allow Radix menu, set value
      event.preventDefault();
      const value = args.row[args.column.key];
      setContextMenuValue(
        value === undefined || value === null ? "" : String(value),
      );
    },
    [],
  );

  // Handler to close the context menu
  const handleCloseContextMenu = React.useCallback(() => {
    setContextMenuState(null);
  }, []);

  // Handler to copy value
  const handleCopy = React.useCallback(() => {
    if (contextMenuState?.value) {
      navigator.clipboard.writeText(contextMenuState.value);
    }
    setContextMenuState(null);
  }, [contextMenuState]);

  // Enhance columns to add cellClass/headerCellClass for outline control
  const enhancedColumns = columns.map((col) => {
    // Checkbox column (SelectColumn) is usually identified by key 'select-row' or similar
    const isCheckbox =
      col.key === "select-row" ||
      col.key === "rdg-select-row" ||
      col.key === "rdg-select-column";
    return {
      ...col,
      cellClass: clsx(col.cellClass, isCheckbox && "rdg-checkbox-cell"),
      headerCellClass: clsx(col.headerCellClass, "rdg-header-cell"),
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
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
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
        <MoreMenuButton
          selectedRows={selectedRows}
          data={data}
          columns={columns}
        />
      </div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div style={{ position: "relative" }} ref={gridRef}>
            <DataGrid
              columns={enhancedColumns}
              rows={data}
              rowKeyGetter={(row: Record<string, unknown>) => String(row.id)}
              selectedRows={selectedRows}
              onSelectedRowsChange={onSelectedRowsChange}
              onRowsChange={onRowsChange}
              renderers={{
                renderCheckbox: ({
                  onChange,
                  ...props
                }: RenderCheckboxProps) => (
                  <Checkbox
                    {...props}
                    onCheckedChange={(checked) => onChange(!!checked, false)}
                  />
                ),
              }}
              className={clsx(
                theme === "light" && "rdg-light",
                "rounded-lg mt-4 w-full",
              )}
              style={{ width: "100%" }}
              onCellContextMenu={handleCellContextMenu}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              if (contextMenuValue) {
                navigator.clipboard.writeText(contextMenuValue);
              }
            }}
          >
            Copy value
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="my-4 text-sm text-muted-foreground">
        Showing {data.length} of {pagination.total} records
      </div>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
