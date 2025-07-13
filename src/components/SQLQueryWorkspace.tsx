"use client";

import { useCustomQueries } from "@/hooks/useCustomQueries";
import { executeCustomSQLQuery } from "@/lib/actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QueryResults } from "./QueryResults";
import { QueryTabs } from "./QueryTabs";
import { SQLEditor } from "./SQLEditor";

interface SQLQueryWorkspaceProps {
  database: string;
  schema: string;
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
}: SQLQueryWorkspaceProps) {
  const {
    queries,
    isLoaded,
    addQuery,
    updateQuery,
    deleteQuery,
    getQuery,
    duplicateQuery,
  } = useCustomQueries({ database, schema });

  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
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
    return activeQueryId ? getQuery(activeQueryId) : null;
  }, [activeQueryId, getQuery]);

  // Sync current query with active query
  useEffect(() => {
    if (activeQuery) {
      setCurrentQuery(activeQuery.query);
    } else if (queries.length === 0) {
      setCurrentQuery("");
    }
  }, [activeQuery, queries.length]);

  // Auto-select first query when loaded
  useEffect(() => {
    if (isLoaded && queries.length > 0 && !activeQueryId) {
      setActiveQueryId(queries[0].id);
    }
  }, [isLoaded, queries, activeQueryId]);

  // Create a new query
  const handleCreateQuery = useCallback(
    (name: string) => {
      const newQueryId = addQuery(
        name,
        "-- Enter your SQL query here\nSELECT 1 as hello_world;",
      );
      setActiveQueryId(newQueryId);
      toast.success(`Created query "${name}"`);
    },
    [addQuery],
  );

  // Switch to a different query
  const handleSelectQuery = useCallback(
    (queryId: string) => {
      // Save current query before switching if there's an active query
      if (activeQueryId && currentQuery !== activeQuery?.query) {
        updateQuery(activeQueryId, { query: currentQuery });
      }
      setActiveQueryId(queryId);
    },
    [activeQueryId, currentQuery, activeQuery?.query, updateQuery],
  );

  // Update query content
  const handleQueryChange = useCallback((query: string) => {
    setCurrentQuery(query);
  }, []);

  // Save current query
  const handleSaveQuery = useCallback(() => {
    if (!activeQueryId) return;
    updateQuery(activeQueryId, { query: currentQuery });
    toast.success("Query saved");
  }, [activeQueryId, currentQuery, updateQuery]);

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

  // Rename a query
  const handleRenameQuery = useCallback(
    (queryId: string, name: string) => {
      updateQuery(queryId, { name });
      toast.success(`Renamed query to "${name}"`);
    },
    [updateQuery],
  );

  // Duplicate a query
  const handleDuplicateQuery = useCallback(
    (queryId: string) => {
      const newQueryId = duplicateQuery(queryId);
      if (newQueryId) {
        setActiveQueryId(newQueryId);
        toast.success("Query duplicated");
      }
    },
    [duplicateQuery],
  );

  // Delete a query
  const handleDeleteQuery = useCallback(
    (queryId: string) => {
      deleteQuery(queryId);

      // If we deleted the active query, switch to another one or clear
      if (queryId === activeQueryId) {
        const remainingQueries = queries.filter((q) => q.id !== queryId);
        if (remainingQueries.length > 0) {
          setActiveQueryId(remainingQueries[0].id);
        } else {
          setActiveQueryId(null);
          setCurrentQuery("");
        }
      }

      toast.success("Query deleted");
    },
    [deleteQuery, activeQueryId, queries],
  );

  // Create initial query if none exist
  useEffect(() => {
    if (isLoaded && queries.length === 0) {
      handleCreateQuery("My First Query");
    }
  }, [isLoaded, queries.length, handleCreateQuery]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading queries...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Query tabs */}
      <QueryTabs
        queries={queries}
        activeQueryId={activeQueryId}
        onSelectQuery={handleSelectQuery}
        onCreateQuery={handleCreateQuery}
        onRenameQuery={handleRenameQuery}
        onDuplicateQuery={handleDuplicateQuery}
        onDeleteQuery={handleDeleteQuery}
      />

      {/* Main content area with editor and results */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* SQL Editor - takes up half the available space */}
        <div className="h-1/2 border-b">
          <SQLEditor
            query={currentQuery}
            onQueryChange={handleQueryChange}
            onExecute={handleExecuteQuery}
            onSave={activeQueryId ? handleSaveQuery : undefined}
            isExecuting={execution.isLoading}
          />
        </div>

        {/* Query Results - takes up the other half */}
        <div className="h-1/2">
          <QueryResults
            results={execution.results}
            columns={execution.columns}
            isLoading={execution.isLoading}
            error={execution.error}
            message={execution.message}
            rowCount={execution.rowCount}
            onRefresh={() => handleExecuteQuery(currentQuery)}
          />
        </div>
      </div>
    </div>
  );
}
