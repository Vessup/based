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
import { deleteRows, fetchTableData } from "@/lib/actions";
import { RefreshCw, Trash2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  const [deleteMessage, setDeleteMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<
    "row" | "selected" | null
  >(null);

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
        setDeleteMessage({
          text: `Successfully deleted ${result.deletedCount} row(s)`,
          type: "success",
        });
        // Clear selection
        setSelectedRows([]);
        // Reload the data
        loadTableData();
      } else {
        setDeleteMessage({
          text: result.message || "Failed to delete rows",
          type: "error",
        });
      }
    } catch (error) {
      setDeleteMessage({
        text: `Error: ${error}`,
        type: "error",
      });
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
        setDeleteMessage({
          text: "Successfully deleted row",
          type: "success",
        });
        // Reload the data
        loadTableData();
      } else {
        setDeleteMessage({
          text: result.message || "Failed to delete row",
          type: "error",
        });
      }
    } catch (error) {
      setDeleteMessage({
        text: `Error: ${error}`,
        type: "error",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Table: {tableName}</h1>
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
        <p>No records found in this table.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Table: {tableName}</h1>

      {deleteMessage && (
        <div
          className={`mb-4 p-2 rounded ${deleteMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {deleteMessage.text}
        </div>
      )}

      <div className="mb-4">
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
              {rowToDelete ? (
                <>
                  This action will delete the selected row from the {tableName}{" "}
                  table.
                </>
              ) : (
                <>
                  This action will delete {selectedRows.length} selected row(s)
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
                rowToDelete ? handleDeleteSingleRow : handleDeleteSelected
              }
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
                      {columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column.column_name}`}>
                          {row[column.column_name as keyof typeof row] !==
                          null ? (
                            String(row[column.column_name as keyof typeof row])
                          ) : (
                            <span className="text-gray-400">NULL</span>
                          )}
                        </TableCell>
                      ))}
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
