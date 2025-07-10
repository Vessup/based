import { Button } from "@/components/ui/button";
import clsx from "clsx";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ListFilter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import type { RenderCheckboxProps } from "react-data-grid";
import { ColumnsMenuButton } from "./ColumnsMenuButton";
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

// Custom sortable header renderer
interface SortableHeaderProps {
  column: { key: string; name: string };
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort: (columnKey: string) => void;
}

const SortableHeader = React.memo(function SortableHeader({ column, sortColumn, sortDirection, onSort }: SortableHeaderProps) {
  const isCurrentSort = sortColumn === column.key;
  
  return (
    <div 
      className="flex items-center justify-between w-full cursor-pointer select-none hover:bg-muted/50 px-2 py-1 -mx-2 -my-1"
      onClick={() => onSort(column.key)}
    >
      <span>{column.name}</span>
      {isCurrentSort && (
        <span className="ml-1 text-muted-foreground">
          {sortDirection === 'desc' ? (
            <ArrowDown size={14} />
          ) : (
            <ArrowUp size={14} />
          )}
        </span>
      )}
    </div>
  );
});

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
  currentPage: number;
  pageSize: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  filters: { id: string; column: string; operator: string; value: string }[];
  onFiltersChange: (
    filters: { id: string; column: string; operator: string; value: string }[],
  ) => void;
  showFilters: boolean;
  onShowFiltersChange: (show: boolean) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onColumnSort: (columnKey: string) => void;
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
  currentPage,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  filters,
  onFiltersChange,
  showFilters,
  onShowFiltersChange,
  sortColumn,
  sortDirection,
  onColumnSort,
}: TableDataGridProps) {
  const { theme } = useTheme();
  const router = useRouter();

  // Custom context menu open state and position for data cells
  const [contextMenuState, setContextMenuState] = React.useState<{
    top: number;
    left: number;
    value: string;
  } | null>(null);

  const [contextMenuValue, setContextMenuValue] = React.useState<string>("");

  const gridRef = React.useRef<HTMLDivElement>(null);

  // State for visible columns
  const [visibleColumns, setVisibleColumns] = React.useState(() =>
    columns.map((col) => col.key),
  );
  React.useEffect(() => {
    setVisibleColumns(columns.map((col) => col.key));
  }, [columns]);
  const visibleCols = React.useMemo(
    () => columns.filter((col) => visibleColumns.includes(col.key)),
    [columns, visibleColumns],
  );

  // Operators
  const operators = [
    { value: "equals", label: "equals" },
    { value: "contains", label: "contains" },
    { value: "startsWith", label: "starts with" },
    { value: "endsWith", label: "ends with" },
  ];

  // Filtered data
  const filteredData = React.useMemo(() => {
    if (!showFilters || filters.length === 0) return data;
    return data.filter((row) => {
      return filters.every((filter) => {
        const cell = row[filter.column];
        if (filter.value === "") return true;
        if (cell == null) return false;
        const cellStr = String(cell).toLowerCase();
        const val = filter.value.toLowerCase();
        switch (filter.operator) {
          case "equals":
            return cellStr === val;
          case "contains":
            return cellStr.includes(val);
          case "startsWith":
            return cellStr.startsWith(val);
          case "endsWith":
            return cellStr.endsWith(val);
          default:
            return true;
        }
      });
    });
  }, [data, filters, showFilters]);

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
      const checkboxKeys = [
        "select-row",
        "rdg-select-row",
        "rdg-select-column",
      ];
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

  // Enhance columns to add cellClass/headerCellClass for outline control and custom FK formatter
  const enhancedColumns = React.useMemo(() => columns.map(
    (
      col: Column<Record<string, unknown>> & {
        foreign_table_name?: string;
        foreign_column_name?: string;
      },
    ) => {
      // Checkbox column (SelectColumn) is usually identified by key 'select-row' or similar
      const isCheckbox =
        col.key === "select-row" ||
        col.key === "rdg-select-row" ||
        col.key === "rdg-select-column";

      // Add custom header renderer for sortable columns (skip checkbox columns)
      // React-data-grid expects headerRenderer to be a React component, not a function returning JSX
      const headerRenderer = isCheckbox ? undefined : function HeaderRenderer() {
        return (
          <SortableHeader
            column={{ key: col.key, name: col.name || col.key }}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onColumnSort}
          />
        );
      };

      // If this column is a foreign key, add a custom formatter
      if (col.foreign_table_name && col.foreign_column_name) {
        return {
          ...col,
          cellClass: clsx(col.cellClass, isCheckbox && "rdg-checkbox-cell"),
          headerCellClass: clsx(col.headerCellClass, "rdg-header-cell"),
          headerRenderer,
          formatter: ({ row }: { row: Record<string, unknown> }) => {
            const value = row[col.key];
            if (value === undefined || value === null || value === "") {
              return <span className="text-gray-400">NULL</span>;
            }
            return (
              <span className="inline-flex items-center gap-1">
                {String(value)}
                <ArrowUpRight
                  className="inline ml-1 cursor-pointer text-blue-500 hover:text-blue-700"
                  size={14}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/tables/${col.foreign_table_name}?filters=${col.foreign_column_name}:equals:${encodeURIComponent(String(value))}`,
                    );
                  }}
                  aria-label={`Go to ${col.foreign_table_name}`}
                />
              </span>
            );
          },
        };
      }
      return {
        ...col,
        cellClass: clsx(col.cellClass, isCheckbox && "rdg-checkbox-cell"),
        headerCellClass: clsx(col.headerCellClass, "rdg-header-cell"),
        headerRenderer,
      };
    },
  ), [columns, sortColumn, sortDirection, onColumnSort, router]);

  return (
    <>
      <style>{customGridStyles}</style>
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
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
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => onShowFiltersChange(!showFilters)}
          >
            <ListFilter className="h-4 w-4 mr-2" /> Filters
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
          <ColumnsMenuButton
            allColumns={columns}
            visibleColumns={visibleColumns}
            onChange={setVisibleColumns}
          />
          <MoreMenuButton
            selectedRows={selectedRows}
            data={data}
            columns={columns}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Select
              value={String(pageSize || 20)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger size="sm">
                <SelectValue>{`${pageSize || 20} per page`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="250">250 per page</SelectItem>
                <SelectItem value="500">500 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) onPageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : 0}
                />
              </PaginationItem>
              {/* Smart pagination window */}
              {(() => {
                const pages = [];
                const window = 2; // pages before/after current
                const total = pageCount;
                const start = Math.max(2, currentPage - window);
                const end = Math.min(total - 1, currentPage + window);
                // Always show first page
                pages.push(
                  <PaginationItem key={1}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === 1}
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage !== 1) onPageChange(1);
                      }}
                      aria-disabled={pageCount === 1}
                      tabIndex={pageCount === 1 ? -1 : 0}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>,
                );
                // Ellipsis if needed
                if (start > 2) {
                  pages.push(
                    <PaginationItem key="start-ellipsis">
                      <span className="px-2">…</span>
                    </PaginationItem>,
                  );
                }
                // Window of pages
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === i}
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage !== i) onPageChange(i);
                        }}
                        aria-disabled={pageCount === 1}
                        tabIndex={pageCount === 1 ? -1 : 0}
                      >
                        {i}
                      </PaginationLink>
                    </PaginationItem>,
                  );
                }
                // Ellipsis if needed
                if (end < total - 1) {
                  pages.push(
                    <PaginationItem key="end-ellipsis">
                      <span className="px-2">…</span>
                    </PaginationItem>,
                  );
                }
                // Always show last page if more than 1
                if (total > 1) {
                  pages.push(
                    <PaginationItem key={total}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === total}
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage !== total) onPageChange(total);
                        }}
                        aria-disabled={pageCount === 1}
                        tabIndex={pageCount === 1 ? -1 : 0}
                      >
                        {total}
                      </PaginationLink>
                    </PaginationItem>,
                  );
                }
                return pages;
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < pageCount) onPageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === pageCount}
                  tabIndex={currentPage === pageCount ? -1 : 0}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      {showFilters && (
        <div className="flex flex-col gap-2 bg-muted/40 px-4 py-2 rounded-b-md border-b border-border">
          {filters.map((filter, i) => (
            <div key={filter.id} className="flex items-center gap-1">
              {i === 0 ? (
                <span className="text-xs text-muted-foreground mr-1">
                  where
                </span>
              ) : null}
              <select
                className="rounded bg-background border px-2 py-1 text-xs"
                value={filter.column}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].column = e.target.value;
                  onFiltersChange(newFilters);
                }}
              >
                {columns
                  .filter(
                    (col) =>
                      ![
                        "select-row",
                        "rdg-select-row",
                        "rdg-select-column",
                      ].includes(col.key),
                  )
                  .map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.name || col.key}
                    </option>
                  ))}
              </select>
              <select
                className="rounded bg-background border px-2 py-1 text-xs"
                value={filter.operator}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].operator = e.target.value;
                  onFiltersChange(newFilters);
                }}
              >
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                className="rounded bg-background border px-2 py-1 text-xs min-w-24"
                value={filter.value}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].value = e.target.value;
                  onFiltersChange(newFilters);
                }}
                placeholder="value"
              />
              <button
                className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  onFiltersChange(filters.filter((_, idx) => idx !== i))
                }
                disabled={filters.length === 1}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2"
            onClick={() => {
              const dataCols = columns.filter(
                (col) =>
                  ![
                    "select-row",
                    "rdg-select-row",
                    "rdg-select-column",
                  ].includes(col.key),
              );
              onFiltersChange([
                ...filters,
                {
                  id: Math.random().toString(36).slice(2),
                  column: dataCols[0]?.key || "",
                  operator: "equals",
                  value: "",
                },
              ]);
            }}
          >
            + Add filter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2"
            onClick={() => {
              const dataCols = columns.filter(
                (col) =>
                  ![
                    "select-row",
                    "rdg-select-row",
                    "rdg-select-column",
                  ].includes(col.key),
              );
              onFiltersChange([
                {
                  id: Math.random().toString(36).slice(2),
                  column: dataCols[0]?.key || "",
                  operator: "equals",
                  value: "",
                },
              ]);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div style={{ position: "relative" }} ref={gridRef}>
            <DataGrid
              columns={enhancedColumns.filter((col) =>
                visibleColumns.includes(col.key),
              )}
              rows={filteredData}
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
