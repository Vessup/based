"use client";

import { SQLQueryWorkspace } from "@/components/SQLQueryWorkspace";
import { useCustomQueries } from "@/hooks/useCustomQueries";
import { useParams } from "next/navigation";

export default function QueryPage() {
  const params = useParams<{ queryId: string }>();
  const queryId = params.queryId;

  // Get the current schema from localStorage to match the sidebar selection
  const database = process.env.POSTGRES_DB || "based";
  const schema = (() => {
    try {
      return localStorage.getItem("based-current-schema") || "public";
    } catch {
      return "public";
    }
  })();

  const { getQuery } = useCustomQueries({ database, schema });
  const activeQuery = queryId ? getQuery(queryId) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">
          {activeQuery ? activeQuery.name : "SQL Query"}
        </h1>
        <p className="text-muted-foreground">
          Create and execute custom SQL queries against your database
        </p>
      </div>
      <div className="flex-1">
        <SQLQueryWorkspace
          database={database}
          schema={schema}
          queryId={queryId}
        />
      </div>
    </div>
  );
}
