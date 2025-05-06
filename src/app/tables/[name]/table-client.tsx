"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

type TableClientProps = {
  tableName: string;
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  pagination: PaginationInfo;
  currentPage: number;
  pageSize: number;
};

export default function TableClient({
  tableName,
  data,
  columns,
  pagination,
  currentPage,
  pageSize,
}: TableClientProps) {
  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          href={`/tables/${tableName}?page=1&pageSize=${pageSize}`}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Calculate range of pages to show
    const startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.pageCount - 1, startPage + maxVisiblePages - 2);

    // Adjust if we're near the beginning
    if (startPage > 2) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href={`/tables/${tableName}?page=${i}&pageSize=${pageSize}`}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Add ellipsis if needed
    if (endPage < pagination.pageCount - 1) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if we have more than one page
    if (pagination.pageCount > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            href={`/tables/${tableName}?page=${pagination.pageCount}&pageSize=${pageSize}`}
            isActive={currentPage === pagination.pageCount}
          >
            {pagination.pageCount}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (data.length === 0) {
    return <p>No records found in this table.</p>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableCaption>
            Showing {data.length} of {pagination.total} records
          </TableCaption>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.column_name}>
                  {column.column_name}
                  <span className="ml-1 text-xs text-gray-500">
                    ({column.data_type})
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => {
              // Create a unique key from row data if possible, fallback to index if needed
              const rowKey = row.id || row.ID || row.uuid || row.UUID || `row-${rowIndex}`;

              return (
                <TableRow key={String(rowKey)}>
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column.column_name}`}>
                      {row[column.column_name as keyof typeof row] !== null
                        ? String(row[column.column_name as keyof typeof row])
                        : <span className="text-gray-400">NULL</span>}
                    </TableCell>
                  ))}
                </TableRow>
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
                  href={`/tables/${tableName}?page=${Math.max(1, currentPage - 1)}&pageSize=${pageSize}`}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {renderPaginationItems()}

              <PaginationItem>
                <PaginationNext
                  href={`/tables/${tableName}?page=${Math.min(pagination.pageCount, currentPage + 1)}&pageSize=${pageSize}`}
                  aria-disabled={currentPage === pagination.pageCount}
                  className={currentPage === pagination.pageCount ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}
