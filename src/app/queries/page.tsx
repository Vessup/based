"use client";

import { SQLQueryWorkspace } from "@/components/SQLQueryWorkspace";
import { useCustomQueries } from "@/hooks/useCustomQueries";
import { useSearchParams } from "next/navigation";

export default function QueriesPage() {
  // Get the current schema from localStorage to match the sidebar selection
  const database = process.env.POSTGRES_DB || "based";
  const schema = (() => {
    try {
      return localStorage.getItem("based-current-schema") || "public";
    } catch {
      return "public";
    }
  })();

  const searchParams = useSearchParams();
  const queryId = searchParams.get("queryId");
  const { getQuery } = useCustomQueries({ database, schema });
  const activeQuery = queryId ? getQuery(queryId) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">
          {activeQuery ? activeQuery.name : "SQL Queries"}
        </h1>
        <p className="text-muted-foreground">
          {activeQuery
            ? "Create and execute custom SQL queries against your database"
            : "Select a query from the sidebar or create a new one"}
        </p>
      </div>
      <div className="flex-1">
        <SQLQueryWorkspace database={database} schema={schema} />
      </div>
    </div>
  );
}
