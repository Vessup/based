import { SQLQueryWorkspace } from "@/components/SQLQueryWorkspace";

export default function QueriesPage() {
  // For now, we'll use hardcoded database and schema values
  // In a real application, these would come from the URL params or context
  const database = process.env.POSTGRES_DB || "based";
  const schema = "public"; // Default to public schema

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">SQL Queries</h1>
        <p className="text-muted-foreground">
          Create and execute custom SQL queries against your database
        </p>
      </div>
      <div className="flex-1">
        <SQLQueryWorkspace database={database} schema={schema} />
      </div>
    </div>
  );
}
