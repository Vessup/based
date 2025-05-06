"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import { fetchTableData } from "@/lib/actions";

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
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
    pageCount: 0,
  });

  // Fetch data on component mount and when params change
  useEffect(() => {
    async function loadTableData() {
      if (!tableName) return;

      setLoading(true);
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
      }
    }

    loadTableData();
  }, [tableName, page, pageSize]);

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
      </PaginationItem>
    );

    // Calculate range of pages to show
    const startPage = Math.max(2, page - Math.floor(maxVisiblePages / 2));
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
            isActive={page === i}
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
            isActive={page === pagination.pageCount}
          >
            {pagination.pageCount}
          </PaginationLink>
        </PaginationItem>
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
        <h1 className="text-2xl font-bold mb-4">Table: {tableName}</h1>
        <p>No records found in this table.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Table: {tableName}</h1>

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
                  className={page === pagination.pageCount ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
