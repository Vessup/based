"use client";

import { SQLQueryWorkspace } from "@/components/SQLQueryWorkspace";
import { useCustomQueries } from "@/hooks/useCustomQueries";
import { useSearchParams } from "next/navigation";

export default function QueriesPage() {
  // For now, we'll use hardcoded database and schema values
  // In a real application, these would come from the URL params or context
  const database = process.env.POSTGRES_DB || "based";
  const schema = "public"; // Default to public schema

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
