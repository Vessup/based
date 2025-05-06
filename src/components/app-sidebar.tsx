"use client";

import {
  Database,
  RefreshCw,
  Table,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { fetchDatabaseTables } from "@/lib/actions";

export function AppSidebar() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to load tables
  const loadTables = useCallback(async () => {
    try {
      setRefreshing(true);
      const result = await fetchDatabaseTables();

      if (result.error) {
        setError(result.error);
      } else {
        setTables(result.tables);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch database tables:", err);
      setError("Failed to load database tables");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load tables on initial render only
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Database Tables
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadTables}
              disabled={refreshing}
              className="h-6 w-6"
              title="Refresh tables list"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>Loading tables...</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : error ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>{error}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : tables.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>No tables found</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                tables.map((tableName) => (
                  <SidebarMenuItem key={tableName}>
                    <SidebarMenuButton asChild>
                      <Link href={`/tables/${tableName}`}>
                        <Table className="h-4 w-4" />
                        <span>{tableName}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Theme toggle at the bottom of sidebar */}
        <div className="mt-auto pt-4 pb-2 flex justify-center">
          <ThemeToggle />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
