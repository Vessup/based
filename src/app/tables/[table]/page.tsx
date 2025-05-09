"use client";

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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addTableRow, deleteRows, fetchTableData, updateTableCell } from "@/lib/actions";
import { format, isValid, parseISO } from "date-fns";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataGrid, type Column, SelectColumn, textEditor } from "react-data-grid";
import { toast, Toaster } from "sonner";
import "react-data-grid/lib/styles.css";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import clsx from "clsx";
import { useTheme } from "next-themes";

// Define types for our data
type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
};

type PaginationInfo = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

// Custom date editor component for react-data-grid
interface EditorProps {
  row: Record<string, unknown>;
  column: { key: string };
  onRowChange: (row: Record<string, unknown>) => void;
  onClose: (commit: boolean) => void;
}

function DateEditor({ row, column, onRowChange, onClose }: EditorProps) {
  const value = row[column.key] ? new Date(row[column.key] as string) : undefined;

  return (
    <DatePicker
      date={value}
      setDate={(date) => {
        onRowChange({ ...row, [column.key]: date ? date.toISOString() : null });
        onClose(true);
      }}
    />
  );
}

// Custom date formatter component for react-data-grid
function DateFormatter({ value }: { value: unknown }) {
  if (!value) return <span className="text-gray-400">NULL</span>;

  try {
    if (typeof value === 'string') {
      const date = parseISO(value);
      if (isValid(date)) {
        return format(date, 'PPP');
      }
    }
  } catch (e) {
    // Fall back to raw value if parsing fails
  }

  return String(value);
}

export default function TablePage() {
  // Get route params and search params
  const params = useParams<{ table: string }>();
  const searchParams = useSearchParams();
  const tableName = params.table as string;
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");
  const { theme } = useTheme();

  // State for data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);

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
    try {
      const result = await deleteRows(tableName, Array.from(selectedRows));

      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} row(s)`);
        // Clear selection
        setSelectedRows(new Set());
        // Reload the data
        loadTableData();
      } else {
        toast.error(result.message || "Failed to delete rows");
      }
    } catch (error) {
      toast.error(`Error: ${error}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Handle single row deletion
  const handleDeleteSingleRow = async () => {
    if (!rowToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteRows(tableName, [rowToDelete]);

      if (result.success) {
        toast.success("Successfully deleted row");
        // Reload the data
        loadTableData();
      } else {
        toast.error(result.message || "Failed to delete row");
      }
    } catch (error) {
      toast.error(`Error: ${error}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  // Determine if a column is a date type
  const isDateColumn = (dataType: string) => {
    return dataType.toLowerCase().includes('date') ||
           dataType.toLowerCase().includes('timestamp');
  };

  // Handle adding a new record
  const handleAddRecord = async (data: Record<string, unknown>) => {
    setIsAddingRecord(true);
    try {
      const result = await addTableRow(tableName, data);

      if (result.success) {
        toast.success("Record added successfully");
        // Reload the data to show the new record
        loadTableData();
      } else {
        toast.error(result.message || "Failed to add record");
      }
    } catch (error) {
      toast.error(`Error adding record: ${error}`);
    } finally {
      setIsAddingRecord(false);
      setIsAddDialogOpen(false);
    }
  };

  // Handle cell edit
  const handleCellEdit = async (rowKey: string, columnName: string, value: unknown) => {
    try {
      const result = await updateTableCell(tableName, rowKey, columnName, value);

      if (result.success) {
        toast.success("Cell updated successfully");
        // Update the local data to reflect the change
        setData(prevData =>
          prevData.map(row => {
            const id = String(row.id || row.ID || row.uuid || row.UUID);
            if (id === rowKey) {
              return { ...row, [columnName]: value };
            }
            return row;
          })
        );
      } else {
        toast.error(result.message || "Failed to update cell");
        // Reload the data to revert changes
        loadTableData();
      }
    } catch (error) {
      toast.error(`Error updating cell: ${error}`);
      // Reload the data to revert changes
      loadTableData();
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

      try {
        const result = await fetchTableData(tableName, page, pageSize);

        if (result.error) {
          setError(result.error);
        } else {
          // Convert any Date objects to ISO strings to avoid React rendering issues
          const processedData = result.data.records.map((record: Record<string, unknown>) => {
            const processedRecord = { ...record };
            for (const key in processedRecord) {
              if (processedRecord[key] instanceof Date) {
                processedRecord[key] = (processedRecord[key] as Date).toISOString();
              }
            }
            return processedRecord;
          });

          setData(processedData);
          setColumns(result.columns);
          setPagination(result.data.pagination);
          setError(null);
        }
      } catch (err) {
        setError(`Failed to load table data: ${err}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tableName, page, pageSize],
  );

  // Function to handle manual refresh
  const handleRefresh = () => {
    loadTableData(true);
  };

  // Fetch data on component mount and when params change
  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Function to determine if a column is a date type - defined inside the component to avoid recreating
  const checkIsDateColumn = useCallback((dataType: string) => {
    return dataType.toLowerCase().includes('date') ||
           dataType.toLowerCase().includes('timestamp');
  }, []);

  // Function to open delete dialog for a row - defined with useCallback to avoid recreating
  const handleRowDelete = useCallback((rowKey: string) => {
    setRowToDelete(rowKey);
    setPendingDeleteAction("row");
    setIsDeleteDialogOpen(true);
  }, []);

  // Create grid columns based on database columns
  const gridColumns = useMemo(() => {
    if (!columns.length) return [];

    // Add select column for row selection
    const cols: Column<Record<string, unknown>>[] = [SelectColumn];

    // Add columns from database
    for (const column of columns) {
      const isDate = checkIsDateColumn(column.data_type);

      cols.push({
        key: column.column_name,
        name: column.column_name,
        // editor: isDate ? DateEditor : textEditor,
        width: 'max-content',
        resizable: true,
        formatter: isDate ? DateFormatter : undefined,
        editable: true,
      } as Column<Record<string, unknown>>);
    }

    // Add actions column
    cols.push({
      key: 'actions',
      name: 'Actions',
      width: 100,
      formatter: ({ row }: { row: Record<string, unknown> }) => {
        const rowKey = String(row.id || row.ID || row.uuid || row.UUID);
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleRowDelete(rowKey);
            }}
            className="h-8 w-8 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        );
      }
    } as Column<Record<string, unknown>>);

    return cols;
  }, [columns, checkIsDateColumn, handleRowDelete]);

  // Handle row selection changes
  const handleRowSelectionChange = (selectedRows: Set<string>) => {
    setSelectedRows(selectedRows);
  };

  // Handle cell changes
  const handleCellChange = (
    newRows: Record<string, unknown>[],
    { indexes, column }: { indexes: number[], column: { key: string } }
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

    // Save the change to the database
    handleCellEdit(rowKey, columnName, value);
  };

  return (
    <div className="w-full">
      <div className="flex items-center p-3 pl-2.5">
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

      <div className="px-4 mt-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </Button>

          {selectedRows.size > 0 && (
            <Button
              onClick={openDeleteDialog}
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

        <div className="mt-4">
          <DataGrid
            columns={gridColumns}
            rows={data}
            rowKeyGetter={(row: Record<string, unknown>) => String(row.id)}
            selectedRows={selectedRows}
            onSelectedRowsChange={handleRowSelectionChange}
            onRowsChange={handleCellChange}
            // renderCheckbox={props => Checkbox} TODO: add checkbox component
            className={clsx(theme === "light" && "rdg-light", "rounded-lg")}
          />
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} records
        </div>
      </div>

      <Toaster position="bottom-left" richColors />

      {/* Add Record Dialog */}
      <AddRecordDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        columns={columns}
        tableName={tableName}
        onAddRecord={handleAddRecord}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteAction === "row" ? (
                <>This action will delete the selected row from the {tableName} table.</>
              ) : (
                <>This action will delete {selectedRows.size} selected row(s) from the {tableName} table.</>
              )}
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={pendingDeleteAction === "row" ? handleDeleteSingleRow : handleDeleteSelected}
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

// Add Record Dialog
function AddRecordDialog({
  isOpen,
  onClose,
  columns,
  tableName,
  onAddRecord,
}: {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnInfo[];
  tableName: string;
  onAddRecord: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleInputChange = (columnName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onAddRecord(formData);
      onClose();
    } catch (error) {
      console.error("Error adding record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateColumn = (dataType: string) => {
    return dataType.toLowerCase().includes('date') ||
           dataType.toLowerCase().includes('timestamp');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Record to {tableName}</DialogTitle>
          <DialogDescription>
            Fill in the fields below to add a new record to the table.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {columns.map((column) => {
            // Show all columns, including ID, createdAt, and updatedAt
            // Users should be able to specify values for all fields

            const isDate = isDateColumn(column.data_type);

            return (
              <div key={column.column_name} className="grid grid-cols-4 items-center gap-4">
                <label htmlFor={column.column_name} className="text-right">
                  {column.column_name}
                </label>
                {isDate ? (
                  <div className="col-span-3">
                    <DatePicker
                      date={formData[column.column_name] ? new Date(formData[column.column_name] as string) : undefined}
                      setDate={(date) => {
                        // Use a more direct approach to update the form data
                        setFormData({
                          ...formData,
                          [column.column_name]: date ? date.toISOString() : null
                        });
                      }}
                    />
                  </div>
                ) : (
                  <input
                    id={column.column_name}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData[column.column_name] !== undefined ? String(formData[column.column_name]) : ''}
                    onChange={(e) => handleInputChange(column.column_name, e.target.value)}
                    placeholder={`Enter ${column.column_name}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
