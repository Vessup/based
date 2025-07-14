"use client";

import { TableDataGrid } from "@/components/TableDataGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCheck, Copy, Database } from "lucide-react";
import { useMemo, useState } from "react";
import type { Column } from "react-data-grid";
import { toast } from "sonner";

interface QueryResultsProps {
  results: Record<string, unknown>[] | null;
  columns: Array<{ key: string; name: string; type: string }> | null;
  isLoading: boolean;
  error: string | null;
  message: string | null;
  rowCount?: number;
  onRefresh?: () => void;
}

export function QueryResults({
  results,
  columns,
  isLoading,
  error,
  message,
  rowCount = 0,
  onRefresh,
}: QueryResultsProps) {
  const [copiedData, setCopiedData] = useState<string | null>(null);

  // Convert query results to format expected by TableDataGrid
  const gridColumns: Column<Record<string, unknown>>[] = useMemo(() => {
    if (!columns || columns.length === 0) return [];

    return columns.map((col) => ({
      key: col.key,
      name: col.name,
      resizable: true,
      sortable: true,
      formatter: ({ row }: { row: Record<string, unknown> }) => {
        const value = row[col.key];
        if (value === null || value === undefined) {
          return <span className="text-gray-400">NULL</span>;
        }
        // Handle Date objects specifically
        if (value instanceof Date) {
          return <span>{value.toISOString()}</span>;
        }
        if (typeof value === "object") {
          return <span className="text-blue-600">{JSON.stringify(value)}</span>;
        }
        return <span>{String(value)}</span>;
      },
    }));
  }, [columns]);

  const handleCopyResults = async () => {
    if (!results || results.length === 0) {
      toast.error("No results to copy");
      return;
    }

    try {
      // Convert results to CSV format
      const headers = columns?.map((col) => col.name) || [];
      const csvContent = [
        headers.join(","),
        ...results.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return "";
              if (typeof value === "string" && value.includes(",")) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            })
            .join(","),
        ),
      ].join("\n");

      await navigator.clipboard.writeText(csvContent);
      setCopiedData(`${csvContent.substring(0, 50)}...`);
      toast.success("Results copied to clipboard as CSV");

      // Reset copy indication after 2 seconds
      setTimeout(() => setCopiedData(null), 2000);
    } catch (error) {
      toast.error("Failed to copy results to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30">
        <div className="text-center">
          <Database className="h-8 w-8 mx-auto mb-2 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Executing query...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <div className="font-medium mb-2">Query execution failed:</div>
            <div className="font-mono text-sm bg-destructive/10 p-3 rounded border">
              {error}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30">
        <div className="text-center">
          <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            {message || "No results returned"}
          </p>
          {message?.includes("successfully") && (
            <p className="text-sm text-muted-foreground mt-1">
              The query executed successfully but returned no rows.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Results toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {rowCount} row{rowCount !== 1 ? "s" : ""} returned
          </span>
          {message && (
            <span className="text-sm text-muted-foreground">{message}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyResults}
            disabled={!results || results.length === 0}
          >
            {copiedData ? (
              <>
                <CheckCheck className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy as CSV
              </>
            )}
          </Button>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className="flex-1">
        <TableDataGrid
          columns={gridColumns}
          data={results}
          onColumnSort={() => {}} // Query results are read-only
          sortColumn={undefined}
          sortDirection={undefined}
          refreshing={false}
          onRefresh={() => onRefresh?.()}
          onShowFiltersChange={() => {}} // No filters for query results
          showFilters={false}
          selectedRows={new Set()}
          onSelectedRowsChange={() => {}} // No row selection for query results
          onRowsChange={() => {}} // No editing for query results
          isAddingNewRow={false}
          onAddRecord={() => {}} // No adding records for query results
          onDeleteSelected={() => {}} // No deleting for query results
          isDeleting={false}
          pagination={{ total: results.length }}
          currentPage={1}
          pageSize={results.length}
          pageCount={1}
          onPageChange={() => {}} // All results shown
          onPageSizeChange={() => {}} // All results shown
          filters={[]}
          onFiltersChange={() => {}}
        />
      </div>
    </div>
  );
}
