"use client";

import { DateInput } from "@/components/date-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addTableRow,
  deleteRows,
  fetchTableData,
  updateTableCell,
} from "@/lib/actions";
import { format, isValid, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Column,
  DataGrid,
  type RenderEditCellProps,
  SelectColumn,
  textEditor,
} from "react-data-grid";
import { Toaster, toast } from "sonner";
import "react-data-grid/lib/styles.css";
import { TableDataGrid } from "@/components/TableDataGrid";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import Link from "next/link";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
NProgress.configure({ showSpinner: false });

// Define types for our data
type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  foreign_table_name?: string;
  foreign_column_name?: string;
};

type PaginationInfo = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

// Custom text editor with check/cancel buttons
function TextEditorWithButtons({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<Record<string, unknown>>) {
  const [value, setValue] = useState(
    row[column.key] !== null && row[column.key] !== undefined
      ? String(row[column.key])
      : "",
  );

  const handleSave = () => {
    onRowChange({ ...row, [column.key]: value }, true);
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <div className="relative w-full h-full">
      <input
        ref={(input) => input?.focus()}
        className="w-full h-full px-2 py-1 border-0 outline-none bg-transparent"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          } else if (e.key === "Escape") {
            e.preventDefault();
            handleCancel();
          }
        }}
      />
      <div className="absolute -right-14 top-1/2 -translate-y-1/2 flex gap-1 bg-background border rounded shadow-sm z-50">
        <button
          type="button"
          onClick={handleSave}
          className="p-1 hover:bg-green-100 rounded-l text-green-600 border-r"
          title="Save (Enter)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Save"
          >
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 hover:bg-red-100 rounded-r text-red-600"
          title="Cancel (Esc)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Cancel"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DateEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<Record<string, unknown>>) {
  // Convert row value to string format for DateInput
  const initialValue = (() => {
    if (!row[column.key]) return null;
    const dateStr = String(row[column.key]);

    // If it's already in YYYY-MM-DD format, use as-is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    // For timestamps, parse and convert to YYYY-MM-DD
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  })();

  const [value, setValue] = useState<string | null>(initialValue);

  const handleSave = useCallback(() => {
    onRowChange({ ...row, [column.key]: value }, true);
  }, [value, row, column.key, onRowChange]);

  const handleCancel = useCallback(() => {
    onClose(false);
  }, [onClose]);

  return (
    <DateInput
      value={value}
      onChange={setValue}
      onSave={handleSave}
      onCancel={handleCancel}
      showTextInput={false}
      showSaveCancel={true}
      autoFocus={true}
    />
  );
}

// Custom date formatter component for react-data-grid
function DateFormatter({ value }: { value: unknown }) {
  if (!value) return <span className="text-gray-400">NULL</span>;

  try {
    if (typeof value === "string") {
      // If it's a date-only format (YYYY-MM-DD), display it as-is
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return value;
      }

      // For timestamps, parse and format in UTC
      const date = parseISO(value);
      if (isValid(date)) {
        // Format as UTC date
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
  } catch (e) {
    // Fall back to raw value if parsing fails
  }

  return String(value);
}

// Component for new row inputs
interface NewRowFormatterProps {
  row: Record<string, unknown>;
  column: { key: string; name: string };
  onUpdate: (columnKey: string, value: unknown) => void;
  dataType?: string;
  onSave?: () => void;
  onCancel?: () => void;
  isFirstColumn?: boolean;
}

function NewRowFormatter({
  row,
  column,
  onUpdate,
  dataType,
  onSave,
  onCancel,
  isFirstColumn,
}: NewRowFormatterProps) {
  // Use local state to avoid re-rendering issues
  const [localValue, setLocalValue] = useState(row[column.key] ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (newValue: unknown) => {
    setLocalValue(newValue);
    onUpdate(column.key, newValue);
  };

  const isDateColumn =
    dataType &&
    (dataType.toLowerCase().includes("date") ||
      dataType.toLowerCase().includes("timestamp"));

  const isBooleanColumn = dataType?.toLowerCase().includes("bool");

  const isNumberColumn =
    dataType &&
    (dataType.toLowerCase().includes("int") ||
      dataType.toLowerCase().includes("numeric") ||
      dataType.toLowerCase().includes("float") ||
      dataType.toLowerCase().includes("double") ||
      dataType.toLowerCase().includes("decimal"));

  // Focus the input when it's first rendered (only for the first column)
  useEffect(() => {
    if (isFirstColumn) {
      // Use MutationObserver to detect when the input is actually added to the DOM
      const observer = new MutationObserver(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
          observer.disconnect();
        }
      });

      // Start observing the parent container for changes
      const container = inputRef.current?.parentElement;
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
      }

      // Also try multiple methods to ensure focus
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      };

      // Try immediate focus
      focusInput();

      // Try with multiple timeouts
      setTimeout(focusInput, 0);
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 100);
      setTimeout(focusInput, 200);

      // Try with requestAnimationFrame
      requestAnimationFrame(() => {
        focusInput();
        requestAnimationFrame(focusInput);
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [isFirstColumn]);

  if (isDateColumn) {
    return (
      <DateInput
        value={localValue}
        onChange={(value) => {
          setLocalValue(value || "");
          handleChange(value);
        }}
        onSave={onSave}
        onCancel={onCancel}
        autoFocus={isFirstColumn}
        showTextInput={true}
        showSaveCancel={false}
      />
    );
  }

  if (isBooleanColumn) {
    return (
      <div className="h-full flex items-center px-2">
        <input
          type="checkbox"
          checked={Boolean(localValue)}
          onChange={(e) => handleChange(e.target.checked)}
          className="w-4 h-4"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const checkbox = e.currentTarget;
              checkbox.checked = !checkbox.checked;
              handleChange(checkbox.checked);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel?.();
            } else if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              onSave?.();
            } else if (e.key === "Tab") {
              e.stopPropagation();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type={isNumberColumn ? "number" : "text"}
      className="w-full h-full px-2 py-1 border-0 outline-none bg-transparent"
      style={{ minHeight: "35px", backgroundColor: "white", color: "black" }}
      value={String(localValue)}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={`Enter ${column.name}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel?.();
        } else if (e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          onSave?.();
        } else if (e.key === "Tab") {
          // Don't prevent default - let the browser handle tab navigation
          e.stopPropagation(); // Stop react-data-grid from intercepting
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

// Helper to start NProgress if not already started
function startNProgress() {
  if (!NProgress.isStarted()) {
    NProgress.start();
  }
}

function doneNProgress() {
  NProgress.done();
}

// Helper to show error toast with copy button
function showError(message: string, error?: unknown) {
  const errorMessage = error ? `${message}: ${error}` : message;

  toast.error(errorMessage, {
    duration: 10000, // Show for 10 seconds
    action: {
      label: "Copy",
      onClick: () => {
        navigator.clipboard
          .writeText(errorMessage)
          .then(() => {
            toast.success("Error copied to clipboard");
          })
          .catch(() => {
            // Failed to copy, but don't log
          });
      },
    },
  });
}

function parseFiltersFromQuery(
  searchParams: URLSearchParams,
  columns: ColumnInfo[],
): { id: string; column: string; operator: string; value: string }[] {
  const filtersParam = searchParams.get("filters");
  if (!filtersParam)
    return [
      {
        id: Math.random().toString(36).slice(2),
        column: columns[0]?.column_name || "",
        operator: "equals",
        value: "",
      },
    ];
  return filtersParam.split(",").map((f: string) => {
    const [column, operator, ...rest] = f.split(":");
    return {
      id: Math.random().toString(36).slice(2),
      column,
      operator: operator || "equals",
      value: rest.join(":") || "",
    };
  });
}

function serializeFiltersToQuery(
  filters: { id: string; column: string; operator: string; value: string }[],
) {
  return filters
    .map(
      (f) =>
        `${encodeURIComponent(f.column)}:${encodeURIComponent(
          f.operator,
        )}:${encodeURIComponent(f.value)}`,
    )
    .join(",");
}

export default function TablePage() {
  // Get route params and search params
  const params = useParams<{ table: string }>();
  const searchParams = useSearchParams();
  const tableName = params.table as string;
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");
  const sortColumn = searchParams.get("sortColumn") || "";
  const sortDirection =
    (searchParams.get("sortDirection") as "asc" | "desc") || undefined;
  const { theme } = useTheme();
  const router = useRouter();

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 20,
    pageCount: 0,
  });

  // State for selected rows
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<
    "row" | "selected" | null
  >(null);

  // State for adding new record
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const [newRowData, setNewRowData] = useState<Record<string, unknown>>({});
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  // State for filters and filter visibility, synced with URL
  const [showFilters, setShowFilters] = useState(
    searchParams.get("showFilters") === "1",
  );
  const [filters, setFilters] = useState(() =>
    parseFiltersFromQuery(searchParams, columns),
  );

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (showFilters) {
      params.set("showFilters", "1");
    } else {
      params.delete("showFilters");
    }
    params.set("filters", serializeFiltersToQuery(filters));
    router.replace(`?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, showFilters, router.replace, searchParams.entries]);

  // Open delete confirmation dialog for selected rows
  const openDeleteDialog = () => {
    if (selectedRows.size === 0) return;
    setPendingDeleteAction("selected");
    setIsDeleteDialogOpen(true);
  };

  // Open delete confirmation dialog for a single row
  const openRowDeleteDialog = useCallback((rowKey: string) => {
    setRowToDelete(rowKey);
    setPendingDeleteAction("row");
    setIsDeleteDialogOpen(true);
  }, []);

  // Handle delete selected rows
  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    startNProgress();
    try {
      const result = await deleteRows(tableName, Array.from(selectedRows));

      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} row(s)`);
        // Clear selection
        setSelectedRows(new Set());
        // Reload the data
        loadTableData();
      } else {
        showError(result.message || "Failed to delete rows");
      }
    } catch (error) {
      showError("Error deleting rows", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      doneNProgress();
    }
  };

  // Handle single row deletion
  const handleDeleteSingleRow = async () => {
    if (!rowToDelete) return;

    setIsDeleting(true);
    startNProgress();
    try {
      const result = await deleteRows(tableName, [rowToDelete]);

      if (result.success) {
        toast.success("Successfully deleted row");
        // Reload the data
        loadTableData();
      } else {
        showError(result.message || "Failed to delete row");
      }
    } catch (error) {
      showError("Error deleting row", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
      doneNProgress();
    }
  };

  // Determine if a column is a date type
  const isDateColumn = (dataType: string) => {
    return (
      dataType.toLowerCase().includes("date") ||
      dataType.toLowerCase().includes("timestamp")
    );
  };

  // Handle cell edit
  const handleCellEdit = async (
    rowKey: string,
    columnName: string,
    value: unknown,
  ) => {
    startNProgress();
    try {
      const result = await updateTableCell(
        tableName,
        rowKey,
        columnName,
        value,
      );

      if (result.success) {
        toast.success("Cell updated successfully");
        // Update the local data to reflect the change
        setData((prevData) =>
          prevData.map((row) => {
            const id = String(row.id || row.ID || row.uuid || row.UUID);
            if (id === rowKey) {
              return { ...row, [columnName]: value };
            }
            return row;
          }),
        );
      } else {
        showError(result.message || "Failed to update cell");
        // Reload the data to revert changes
        loadTableData();
      }
    } catch (error) {
      showError("Error updating cell", error);
      // Reload the data to revert changes
      loadTableData();
    } finally {
      doneNProgress();
    }
  };

  // Function to load table data
  const loadTableData = useCallback(
    async (isRefresh = false) => {
      if (!tableName) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      startNProgress();

      try {
        const result = await fetchTableData(
          tableName,
          page,
          pageSize,
          sortColumn || undefined,
          sortDirection,
        );

        if (result.error) {
          setError(result.error);
          showError("Failed to load table data", result.error);
        } else {
          // Convert any Date objects to ISO strings to avoid React rendering issues
          const processedData = result.data.records.map(
            (record: Record<string, unknown>) => {
              const processedRecord = { ...record };
              for (const key in processedRecord) {
                if (processedRecord[key] instanceof Date) {
                  processedRecord[key] = (
                    processedRecord[key] as Date
                  ).toISOString();
                }
              }
              return processedRecord;
            },
          );

          setData(processedData);
          setColumns(result.columns);
          setPagination(result.data.pagination);
          setError(null);
        }
      } catch (err) {
        const errorMessage = `Failed to load table data: ${err}`;
        setError(errorMessage);
        showError("Failed to load table data", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        doneNProgress();
      }
    },
    [tableName, page, pageSize, sortColumn, sortDirection],
  );

  // Function to handle manual refresh
  const handleRefresh = () => {
    loadTableData(true);
  };

  // Function to handle adding a new inline row
  const handleAddInlineRow = () => {
    // If there's already a new row being added, don't add another
    if (newRowId) return;

    // Generate a temporary ID for the new row
    const tempId = `new-${Date.now()}`;
    setNewRowId(tempId);

    // Create a new empty row with empty values
    const newRow: Record<string, unknown> = {};

    // Initialize all columns with empty values
    for (const col of columns) {
      // Initialize all columns with empty strings
      newRow[col.column_name] = "";
    }

    // Set the temporary ID after initializing columns to avoid overwriting
    newRow.id = tempId;
    // Also try common variations
    newRow.ID = tempId;
    newRow.uuid = tempId;
    newRow.UUID = tempId;

    // Store the new row data separately
    setNewRowData(newRow);

    // Add the new row to the beginning of the data
    const newData = [newRow, ...data];
    setData(newData);

    // Focus will be handled by the NewRowFormatter component
    // Also try to focus after a delay to ensure the row is rendered
    // Try multiple times with increasing delays
    const focusNewRow = () => {
      const inputs = document.querySelectorAll(
        ".rdg-row input, .rdg input[type='text'], .rdg input[type='number']",
      );

      // Find the input in the new row (should be in the first row)
      for (const input of inputs) {
        const row = input.closest(".rdg-row");
        if (row && input instanceof HTMLInputElement) {
          // Check if this is in the new row by checking if it has our placeholder
          if (input.placeholder?.startsWith("Enter ")) {
            input.focus();
            input.select();
            return true;
          }
        }
      }
      return false;
    };

    // Try multiple times
    setTimeout(() => {
      if (!focusNewRow()) setTimeout(focusNewRow, 50);
    }, 50);
    setTimeout(() => {
      if (!focusNewRow()) setTimeout(focusNewRow, 100);
    }, 150);
    setTimeout(() => {
      if (!focusNewRow()) setTimeout(focusNewRow, 200);
    }, 300);
    setTimeout(() => {
      if (!focusNewRow()) setTimeout(focusNewRow, 300);
    }, 500);

    // Also apply styles to the new row
    setTimeout(() => {
      const rows = document.querySelectorAll(".rdg-row");

      // Find the row that contains our new row inputs
      for (const row of rows) {
        const hasNewRowInput = row.querySelector(
          'input[placeholder^="Enter "]',
        );
        if (hasNewRowInput) {
          const rowElement = row as HTMLElement;
          rowElement.style.backgroundColor =
            theme === "light" ? "rgb(239 246 255)" : "rgb(30 58 138 / 0.3)";
          rowElement.style.outline = "2px solid rgb(59 130 246)";
          rowElement.style.outlineOffset = "-2px";
          rowElement.style.position = "relative";
          rowElement.style.zIndex = "10";

          // Also style all cells in the row
          const cells = rowElement.querySelectorAll(".rdg-cell");
          for (const cell of cells) {
            (cell as HTMLElement).style.backgroundColor =
              theme === "light" ? "rgb(239 246 255)" : "rgb(30 58 138 / 0.3)";
          }
          break; // Found the row, stop searching
        }
      }
    }, 100);
  };

  // Function to update new row data
  const handleNewRowUpdate = useCallback(
    (columnKey: string, value: unknown) => {
      setNewRowData((prev) => ({
        ...prev,
        [columnKey]: value,
      }));

      // Don't update the data array - this causes re-renders and focus loss
      // We'll use the newRowData state when saving instead
    },
    [],
  );

  // Function to handle column sorting
  const handleColumnSort = useCallback(
    (columnKey: string) => {
      try {
        const params = new URLSearchParams(Array.from(searchParams.entries()));

        // Implement 3-state cycle: none -> desc -> asc -> none
        let newSortDirection: "desc" | "asc" | undefined;

        if (sortColumn === columnKey) {
          // Same column clicked, cycle through states
          if (sortDirection === "desc") {
            newSortDirection = "asc";
          } else if (sortDirection === "asc") {
            // Remove sorting
            params.delete("sortColumn");
            params.delete("sortDirection");
            router.push(`?${params.toString()}`);
            return;
          } else {
            newSortDirection = "desc";
          }
        } else {
          // Different column clicked, start with desc
          newSortDirection = "desc";
        }

        params.set("sortColumn", columnKey);
        params.set("sortDirection", newSortDirection);
        params.set("page", "1"); // Reset to first page when sorting
        router.push(`?${params.toString()}`);
      } catch (error) {
        showError("Failed to sort column", error);
      }
    },
    [sortColumn, sortDirection, searchParams, router],
  );

  // Function to determine if a column is a date type - defined inside the component to avoid recreating
  const checkIsDateColumn = useCallback((dataType: string) => {
    return (
      dataType.toLowerCase().includes("date") ||
      dataType.toLowerCase().includes("timestamp")
    );
  }, []);

  // Function to open delete dialog for a row - defined with useCallback to avoid recreating
  const handleRowDelete = useCallback((rowKey: string) => {
    setRowToDelete(rowKey);
    setPendingDeleteAction("row");
    setIsDeleteDialogOpen(true);
  }, []);

  // Function to save new row
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowId) return;

    // Prepare data for insertion
    const dataToInsert = Object.entries(newRowData).reduce(
      (acc, [key, value]) => {
        // Skip the temporary ID fields if they still have the temp value
        if (
          (key === "id" || key === "ID" || key === "uuid" || key === "UUID") &&
          typeof value === "string" &&
          value.startsWith("new-")
        ) {
          return acc;
        }

        // Include non-empty values
        if (value !== "" && value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    try {
      setIsAddingRecord(true);
      startNProgress();

      const result = await addTableRow(tableName, dataToInsert);

      if (result.success) {
        toast.success("Record added successfully");
        setNewRowId(null);
        setNewRowData({});
        // Reload to show the actual saved record with real ID
        loadTableData();
      } else {
        showError(result.message || "Failed to add record");
      }
    } catch (error) {
      showError("Error adding record", error);
    } finally {
      setIsAddingRecord(false);
      doneNProgress();
    }
  }, [newRowId, newRowData, tableName, loadTableData]);

  // Function to cancel new row
  const handleCancelNewRow = useCallback(() => {
    if (!newRowId) return;

    // Remove the new row from data
    setData((prevData) =>
      prevData.filter(
        (row) => String(row.id || row.ID || row.uuid || row.UUID) !== newRowId,
      ),
    );
    setNewRowId(null);
    setNewRowData({});
  }, [newRowId]);

  // Fetch data on component mount and when params change
  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Global keyboard listener for new row
  useEffect(() => {
    if (!newRowId) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancelNewRow();
      } else if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleSaveNewRow();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [newRowId, handleCancelNewRow, handleSaveNewRow]);

  // Create grid columns based on database columns
  const gridColumns = useMemo(() => {
    if (!columns.length) return [];

    // Add select column for row selection with custom logic to exclude new rows
    const customSelectColumn: Column<Record<string, unknown>> = {
      ...SelectColumn,
      renderCell: (props) => {
        const rowId = String(
          props.row.id || props.row.ID || props.row.uuid || props.row.UUID,
        );
        if (newRowId && rowId === newRowId) {
          // Don't render checkbox for new rows
          return null;
        }
        return SelectColumn.renderCell?.(props);
      },
    };
    const cols: Column<Record<string, unknown>>[] = [customSelectColumn];

    // Add columns from database
    for (const column of columns) {
      const isDate = checkIsDateColumn(column.data_type);

      cols.push({
        key: column.column_name,
        name: column.column_name,
        width: "max-content",
        resizable: true,
        renderCell: (props) => {
          const rowId = String(
            props.row.id || props.row.ID || props.row.uuid || props.row.UUID,
          );

          // Use custom formatter for new row
          if (rowId.startsWith("new-")) {
            const isFirst = columns[0]?.column_name === column.column_name;
            return (
              <div
                className="w-full h-full"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
              >
                <NewRowFormatter
                  row={newRowData}
                  column={{ key: column.column_name, name: column.column_name }}
                  onUpdate={handleNewRowUpdate}
                  dataType={column.data_type}
                  onSave={handleSaveNewRow}
                  onCancel={handleCancelNewRow}
                  isFirstColumn={isFirst} // Focus first column
                />
              </div>
            );
          }

          // Use date formatter for date columns
          if (isDate) {
            return <DateFormatter value={props.row[column.column_name]} />;
          }

          // Default formatter
          const value = props.row[column.column_name];
          if (value === null || value === undefined) {
            return <span className="text-gray-400">NULL</span>;
          }
          return String(value);
        },
        renderEditCell: (props) => {
          const rowId = String(
            props.row.id || props.row.ID || props.row.uuid || props.row.UUID,
          );
          // Don't allow editing for new rows (they use inline inputs)
          if (newRowId && rowId === newRowId) {
            return null;
          }
          return isDate ? DateEditor(props) : TextEditorWithButtons(props);
        },
        editable: (row) => {
          const rowId = String(row.id || row.ID || row.uuid || row.UUID);
          // Disable normal editing for new rows
          return !(newRowId && rowId === newRowId);
        },
        foreign_table_name: column.foreign_table_name,
        foreign_column_name: column.foreign_column_name,
      } as Column<Record<string, unknown>> & {
        foreign_table_name?: string;
        foreign_column_name?: string;
      });
    }

    return cols;
  }, [
    columns,
    checkIsDateColumn,
    newRowId,
    newRowData,
    handleSaveNewRow,
    handleCancelNewRow,
    handleNewRowUpdate,
  ]);

  // Handle row selection changes
  const handleRowSelectionChange = (selectedRows: Set<string>) => {
    setSelectedRows(selectedRows);
  };

  // Handle cell changes
  const handleCellChange = async (
    newRows: Record<string, unknown>[],
    { indexes, column }: { indexes: number[]; column: { key: string } },
  ) => {
    const rowIndex = indexes[0];
    const row = newRows[rowIndex];
    const rowKey = String(row.id || row.ID || row.uuid || row.UUID);
    const columnName = column.key;
    const value = row[columnName];

    // Process the rows to ensure no Date objects
    const processedRows = newRows.map((row: Record<string, unknown>) => {
      const processedRow = { ...row };
      for (const key in processedRow) {
        if (processedRow[key] instanceof Date) {
          processedRow[key] = (processedRow[key] as Date).toISOString();
        }
      }
      return processedRow;
    });

    // Update the data
    setData(processedRows);

    // Check if this is a new row
    if (newRowId && rowKey === newRowId) {
      // Don't save individual cell edits for new rows
      // We'll save the entire row when the user is done editing
      return;
    }

    // Save the change to the database for existing rows
    handleCellEdit(rowKey, columnName, value);
  };

  // Function to handle page change from pagination
  const handlePageChange = (newPage: number) => {
    startNProgress();
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("page", String(newPage));
    router.push(`?${params.toString()}`);
    // NProgress will be done after data loads
  };

  return (
    <div className="w-full flex flex-col min-h-svh px-4 pt-2">
      <div className="flex items-center">
        <div>
          <SidebarTrigger />
        </div>
        <div className="ml-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{tableName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <TableDataGrid
        columns={gridColumns}
        data={data}
        selectedRows={selectedRows}
        onSelectedRowsChange={handleRowSelectionChange}
        onRowsChange={handleCellChange}
        pagination={pagination}
        onRefresh={handleRefresh}
        onAddRecord={handleAddInlineRow}
        onDeleteSelected={openDeleteDialog}
        refreshing={refreshing}
        isDeleting={isDeleting}
        isAddingNewRow={!!newRowId}
        currentPage={pagination.page}
        pageSize={pagination.pageSize}
        pageCount={pagination.pageCount}
        onPageChange={handlePageChange}
        onPageSizeChange={(newPageSize) => {
          startNProgress();
          const params = new URLSearchParams(
            Array.from(searchParams.entries()),
          );
          params.set("pageSize", String(newPageSize));
          params.set("page", "1");
          router.push(`?${params.toString()}`);
        }}
        filters={filters}
        onFiltersChange={setFilters}
        showFilters={showFilters}
        onShowFiltersChange={setShowFilters}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onColumnSort={handleColumnSort}
      />

      <Toaster position="bottom-right" richColors />

      {/* Floating save/cancel bar for new row */}
      {newRowId && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3 z-50">
          <span className="text-sm text-muted-foreground">
            Adding new record...
          </span>
          <Button
            size="sm"
            onClick={handleSaveNewRow}
            disabled={isAddingRecord}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2"
              role="img"
              aria-label="Save"
            >
              <path
                d="M13.5 4.5L6 12L2.5 8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Save (Ctrl+Enter)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancelNewRow}
            disabled={isAddingRecord}
          >
            Cancel (Esc)
          </Button>
        </div>
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteAction === "row" ? (
                <>
                  This action will delete the selected row from the {tableName}{" "}
                  table.
                </>
              ) : (
                <>
                  This action will delete {selectedRows.size} selected row(s)
                  from the {tableName} table.
                </>
              )}
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={
                pendingDeleteAction === "row"
                  ? handleDeleteSingleRow
                  : handleDeleteSelected
              }
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
