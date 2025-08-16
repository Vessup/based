"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SQLQueryWorkspace } from "@/components/SQLQueryWorkspace";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCustomQueries } from "@/hooks/useCustomQueries";

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
    <div className="w-full flex flex-col min-h-svh px-4 pt-2">
      <div className="flex items-center mb-4">
        <div>
          <SidebarTrigger />
        </div>
        <div className="ml-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {activeQuery ? activeQuery.name : "SQL Query"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
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
