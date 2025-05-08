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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addTableRow, deleteRows, fetchTableData, updateTableCell } from "@/lib/actions";
import { format, isValid } from "date-fns";
import { Check, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

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

export default function TablePage() {
  // Get route params and search params
  const params = useParams();
  const searchParams = useSearchParams();
  const tableName = params.name as string;
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");

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
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<
    "row" | "selected" | null
  >(null);

  // State for cell editing
  const [editingCell, setEditingCell] = useState<{
    rowKey: string;
    columnName: string;
    value: unknown;
    dataType: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // State for adding new record
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, unknown>>({});
  const [isAddingRecord, setIsAddingRecord] = useState(false);

  // Handle checkbox change
  const handleCheckboxChange = (rowKey: string) => {
    setSelectedRows((prev) =>
      prev.includes(rowKey)
        ? prev.filter((id) => id !== rowKey)
        : [...prev, rowKey],
    );
  };

  // Handle select all checkboxes
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      // If all are selected, unselect all
      setSelectedRows([]);
    } else {
      // Otherwise, select all
      const allRowKeys = data.map((row, index) =>
        String(row.id || row.ID || row.uuid || row.UUID || `row-${index}`),
      );
      setSelectedRows(allRowKeys);
    }
  };

  // Open delete confirmation dialog for selected rows
  const openDeleteDialog = () => {
    if (selectedRows.length === 0) return;
    setPendingDeleteAction("selected");
    // Use setTimeout to ensure the context menu is fully closed before opening the dialog
    setTimeout(() => {
      setIsDeleteDialogOpen(true);
    }, 100);
  };

  // Open delete confirmation dialog for a single row
  const openRowDeleteDialog = (rowKey: string) => {
    setRowToDelete(rowKey);
    setPendingDeleteAction("row");
    // Use setTimeout to ensure the context menu is fully closed before opening the dialog
    setTimeout(() => {
      setIsDeleteDialogOpen(true);
    }, 100);
  };

  // Handle delete selected rows
  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteRows(tableName, selectedRows);

      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} row(s)`);
        // Clear selection
        setSelectedRows([]);
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

  // Handle cell double click to start editing
  const handleCellDoubleClick = (rowKey: string, columnName: string, value: unknown, dataType: string) => {
    setEditingCell({
      rowKey,
      columnName,
      value,
      dataType,
    });
  };

  // Handle cell edit save
  const handleSaveEdit = async () => {
    if (!editingCell) return;

    setIsSaving(true);
    try {
      // Call the API to update the cell
      const result = await updateTableCell(
        tableName,
        editingCell.rowKey,
        editingCell.columnName,
        editingCell.value
      );

      if (result.success) {
        // Reload the data to reflect changes
        loadTableData();
        toast.success("Cell updated successfully");
      } else {
        toast.error(result.message || "Failed to update cell");
      }
    } catch (error) {
      toast.error(`Error updating cell: ${error}`);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
    }
  };

  // Handle cell edit cancel
  const handleCancelEdit = () => {
    setEditingCell(null);
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
          setData(result.data.records);
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

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          href={`/tables/${tableName}?page=1&pageSize=${pageSize}`}
          isActive={page === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>,
    );

    // Calculate range of pages to show
    const startPage = Math.max(2, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(
      pagination.pageCount - 1,
      startPage + maxVisiblePages - 2,
    );

    // Adjust if we're near the beginning
    if (startPage > 2) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href={`/tables/${tableName}?page=${i}&pageSize=${pageSize}`}
            isActive={page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Add ellipsis if needed
    if (endPage < pagination.pageCount - 1) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Always show last page if we have more than one page
    if (pagination.pageCount > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            href={`/tables/${tableName}?page=${pagination.pageCount}&pageSize=${pageSize}`}
            isActive={page === pagination.pageCount}
          >
            {pagination.pageCount}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  if (loading) {
    return <div className="p-8">Loading table data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  if (data.length === 0) {
    return (
      <div className="p-8">
        <Toaster position="top-right" richColors />
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Table: {tableName}</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Add Record Dialog */}
        <AddRecordDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          columns={columns}
          tableName={tableName}
          onAddRecord={handleAddRecord}
        />

        <p>No records found in this table. Click "Add Record" to add your first record.</p>
      </div>
    );
  }


  return (
    <div className="p-8">
      <Toaster position="top-right" richColors />
      <h1 className="text-2xl font-bold mb-4">Table: {tableName}</h1>

      {/* Add Record Dialog */}
      <AddRecordDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        columns={columns}
        tableName={tableName}
        onAddRecord={handleAddRecord}
      />

      <div className="mb-4 flex gap-2">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Record
        </Button>

        <Button
          onClick={openDeleteDialog}
          disabled={selectedRows.length === 0 || isDeleting}
          className="bg-red-600 hover:bg-red-700 text-white"
          size="sm"
        >
          {isDeleting
            ? "Deleting..."
            : `Delete Selected (${selectedRows.length})`}
        </Button>
      </div>

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
                <>This action will delete {selectedRows.length} selected row(s) from the {tableName} table.</>
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

      <div className="rounded-md border">
        <Table>
          <TableCaption className="pb-6">
            Showing {data.length} of {pagination.total} records
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={
                    data.length > 0 && selectedRows.length === data.length
                  }
                  onChange={handleSelectAll}
                  className="h-4 w-4"
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column.column_name}>
                  {column.column_name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => {
              // Create a unique key from row data if possible, fallback to index if needed
              const rowKey = String(
                row.id || row.ID || row.uuid || row.UUID || `row-${rowIndex}`,
              );
              const isSelected = selectedRows.includes(rowKey);

              return (
                <ContextMenu key={rowKey}>
                  <ContextMenuTrigger>
                    <TableRow
                      className={
                        isSelected ? "bg-zinc-100 dark:bg-zinc-800" : ""
                      }
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCheckboxChange(rowKey)}
                          className="h-4 w-4"
                        />
                      </TableCell>
                      {columns.map((column) => {
                        const cellValue = row[column.column_name as keyof typeof row];
                        const isEditing =
                          editingCell?.rowKey === rowKey &&
                          editingCell?.columnName === column.column_name;
                        const isDate = isDateColumn(column.data_type);

                        // Format date values for display
                        let displayValue = cellValue !== null
                          ? String(cellValue)
                          : null;

                        // Try to parse and format dates for better display
                        if (isDate && displayValue && !isEditing) {
                          try {
                            const date = new Date(displayValue);
                            if (isValid(date)) {
                              displayValue = format(date, 'PPP');
                            }
                          } catch (e) {
                            // Keep original value if parsing fails
                          }
                        }

                        return (
                          <TableCell
                            key={`${rowIndex}-${column.column_name}`}
                            onDoubleClick={() => handleCellDoubleClick(
                              rowKey,
                              column.column_name,
                              cellValue,
                              column.data_type
                            )}
                          >
                            {isEditing ? (
                              isDate ? (
                                <DatePicker
                                  date={editingCell.value ? new Date(editingCell.value as string) : undefined}
                                  setDate={(date) => {
                                    setEditingCell({
                                      ...editingCell,
                                      value: date ? date.toISOString() : null
                                    });
                                    // Auto-save for date picker
                                    setTimeout(() => handleSaveEdit(), 100);
                                  }}
                                />
                              ) : (
                                <input
                                  value={editingCell.value !== null ? String(editingCell.value) : ''}
                                  onChange={(e) => {
                                    setEditingCell({
                                      ...editingCell,
                                      value: e.target.value
                                    });
                                  }}
                                  onBlur={handleSaveEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit();
                                    } else if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                  className="w-full h-full border-0 bg-transparent focus:outline-none focus:ring-0"
                                />
                              )
                            ) : (
                              <>
                                {cellValue !== null ? (
                                  displayValue
                                ) : (
                                  <span className="text-gray-400">NULL</span>
                                )}
                              </>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      variant="destructive"
                      onClick={() => openRowDeleteDialog(rowKey)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Row
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pagination.pageCount > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={`/tables/${tableName}?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`}
                  aria-disabled={page === 1}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {renderPaginationItems()}

              <PaginationItem>
                <PaginationNext
                  href={`/tables/${tableName}?page=${Math.min(pagination.pageCount, page + 1)}&pageSize=${pageSize}`}
                  aria-disabled={page === pagination.pageCount}
                  className={
                    page === pagination.pageCount
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
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
