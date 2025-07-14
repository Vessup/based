"use client";

export default function QueriesPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">SQL Queries</h1>
        <p className="text-muted-foreground">
          Select a query from the sidebar or create a new one
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No query selected</div>
          <div className="text-sm text-muted-foreground">
            Select a query from the sidebar or create a new one
          </div>
        </div>
      </div>
    </div>
  );
}
