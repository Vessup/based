"use client";

import { useCustomQueries } from "@/hooks/useCustomQueries";
import { executeCustomSQLQuery } from "@/lib/actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QueryResults } from "./QueryResults";
import { ResizablePanels } from "./ResizablePanels";
import { SQLEditor } from "./SQLEditor";

interface SQLQueryWorkspaceProps {
  database: string;
  schema: string;
  queryId?: string;
}

interface QueryExecution {
  isLoading: boolean;
  results: Record<string, unknown>[] | null;
  columns: Array<{ key: string; name: string; type: string }> | null;
  error: string | null;
  message: string | null;
  rowCount: number;
}

export function SQLQueryWorkspace({
  database,
  schema,
  queryId,
}: SQLQueryWorkspaceProps) {
  const { getQuery, updateQuery, isLoaded } = useCustomQueries({
    database,
    schema,
  });

  const [currentQuery, setCurrentQuery] = useState("");
  const [execution, setExecution] = useState<QueryExecution>({
    isLoading: false,
    results: null,
    columns: null,
    error: null,
    message: null,
    rowCount: 0,
  });

  // Get the active query object
  const activeQuery = useMemo(() => {
    return queryId ? getQuery(queryId) : null;
  }, [queryId, getQuery]);

  // Sync current query with active query
  useEffect(() => {
    if (activeQuery) {
      setCurrentQuery(activeQuery.query);
    } else {
      setCurrentQuery("");
    }
  }, [activeQuery]);

  // Update query content with auto-save
  const handleQueryChange = useCallback(
    (query: string) => {
      setCurrentQuery(query);
      // Auto-save to localStorage if there's an active query
      if (queryId) {
        updateQuery(queryId, { query });
      }
    },
    [queryId, updateQuery],
  );

  // Handle editor height changes
  const handleHeightChange = useCallback(
    (height: number) => {
      // Auto-save height to localStorage if there's an active query
      if (queryId) {
        updateQuery(queryId, { editorHeight: height });
      }
    },
    [queryId, updateQuery],
  );

  // Execute current query
  const handleExecuteQuery = useCallback(async (query: string) => {
    if (!query.trim()) {
      toast.error("Please enter a query to execute");
      return;
    }

    setExecution({
      isLoading: true,
      results: null,
      columns: null,
      error: null,
      message: null,
      rowCount: 0,
    });

    try {
      const result = await executeCustomSQLQuery(query);

      if (result.success) {
        setExecution({
          isLoading: false,
          results: result.results || [],
          columns: result.columns || [],
          error: null,
          message: result.message,
          rowCount: result.rowCount || 0,
        });
        toast.success(result.message);
      } else {
        setExecution({
          isLoading: false,
          results: null,
          columns: null,
          error: result.message,
          message: null,
          rowCount: 0,
        });
        toast.error(result.message);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setExecution({
        isLoading: false,
        results: null,
        columns: null,
        error: errorMessage,
        message: null,
        rowCount: 0,
      });
      toast.error("Failed to execute query");
    }
  }, []);

  // Show message if no query is selected
  if (!queryId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No query selected</div>
          <div className="text-sm text-muted-foreground">
            Select a query from the sidebar or create a new one
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while queries are loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">Loading query...</div>
        </div>
      </div>
    );
  }

  // Show message if query not found (only after queries are loaded)
  if (!activeQuery) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">Query not found</div>
          <div className="text-sm text-muted-foreground">
            The selected query may have been deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main content area with resizable editor and results */}
      <div className="flex-1 min-h-0">
        <ResizablePanels
          initialTopHeight={activeQuery?.editorHeight ?? 50}
          minTopHeight={20}
          maxTopHeight={80}
          onHeightChange={handleHeightChange}
          topPanel={
            <SQLEditor
              query={currentQuery}
              onQueryChange={handleQueryChange}
              onExecute={handleExecuteQuery}
              isExecuting={execution.isLoading}
            />
          }
          bottomPanel={
            <QueryResults
              results={execution.results}
              columns={execution.columns}
              isLoading={execution.isLoading}
              error={execution.error}
              message={execution.message}
              rowCount={execution.rowCount}
              onRefresh={() => handleExecuteQuery(currentQuery)}
            />
          }
        />
      </div>
    </div>
  );
}
