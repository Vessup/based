"use client";

import {
  Database,
  RefreshCw,
  Table,
  Trash2,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchDatabaseTables, deleteTableAction } from "@/lib/actions";


export function AppSidebar() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  // Function to handle table deletion
  const handleDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      const result = await deleteTableAction(tableToDelete);

      // Refresh the tables list after successful deletion
      await loadTables();
    } catch (err) {
      console.error("Error deleting table:", err);
    } finally {
      setIsDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  return (
    <>
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
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <SidebarMenuButton asChild>
                            <Link href={`/tables/${tableName}`}>
                              <Table className="h-4 w-4" />
                              <span>{tableName}</span>
                            </Link>
                          </SidebarMenuButton>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() => {
                              setTableToDelete(tableName);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Table
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
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

      {/* Delete Table Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the table <strong>{tableToDelete}</strong>?
              <br />
              This action cannot be undone and all data in this table will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteTable}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
