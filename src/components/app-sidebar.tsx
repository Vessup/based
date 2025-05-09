"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ChevronDown, Database, MoreHorizontal, Plus, RefreshCw, Table, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDatabaseSchema, deleteTableAction, fetchDatabaseSchemas, fetchDatabaseTables } from "@/lib/actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const [schemas, setSchemas] = useState<string[]>(['public']);
  const [selectedSchema, setSelectedSchema] = useState<string>('public');
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  // State for creating a new schema
  const [isCreateSchemaDialogOpen, setIsCreateSchemaDialogOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [isCreatingSchema, setIsCreatingSchema] = useState(false);
  const [createSchemaError, setCreateSchemaError] = useState<string | null>(null);

  // Function to load schemas
  const loadSchemas = useCallback(async () => {
    try {
      const result = await fetchDatabaseSchemas();

      if (result.error) {
        console.error(result.error);
      } else {
        setSchemas(result.schemas);
      }
    } catch (err) {
      console.error("Failed to fetch database schemas:", err);
    }
  }, []);

  // Function to load tables
  const loadTables = useCallback(async (schema = selectedSchema) => {
    try {
      setRefreshing(true);
      const result = await fetchDatabaseTables(schema);

      if (result.error) {
        setError(result.error);
      } else {
        setTables(result.tables);
        setError(null);
      }
    } catch (err) {
      console.error(`Failed to fetch database tables from schema ${schema}:`, err);
      setError(`Failed to load database tables from schema ${schema}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSchema]);

  // Handle schema change
  const handleSchemaChange = (schema: string) => {
    if (schema === 'create_new') {
      setIsCreateSchemaDialogOpen(true);
    } else {
      setSelectedSchema(schema);
      setLoading(true);
      loadTables(schema);
    }
  };

  // Handle creating a new schema
  const handleCreateSchema = async () => {
    if (!newSchemaName.trim()) {
      setCreateSchemaError('Schema name cannot be empty');
      return;
    }

    setIsCreatingSchema(true);
    setCreateSchemaError(null);

    try {
      const result = await createDatabaseSchema(newSchemaName);

      if (result.success) {
        // Refresh schemas list
        await loadSchemas();
        // Select the newly created schema
        setSelectedSchema(newSchemaName);
        loadTables(newSchemaName);
        // Close the dialog
        setIsCreateSchemaDialogOpen(false);
        setNewSchemaName('');
      } else {
        setCreateSchemaError(result.message || 'Failed to create schema');
      }
    } catch (error) {
      setCreateSchemaError(`Error creating schema: ${error}`);
    } finally {
      setIsCreatingSchema(false);
    }
  };

  // Load schemas and tables on initial render
  useEffect(() => {
    loadSchemas();
    loadTables();
  }, [loadSchemas, loadTables]);

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
        <SidebarHeader>
          <div className="text-center font-extralight text-2xl font-monospace tracking-widest">
            BASED
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="flex justify-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadTables(selectedSchema)}
                disabled={refreshing}
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Schema</SidebarGroupLabel>
            <SidebarGroupAction className="mr-0.5">
              <Plus /> <span className="sr-only">Add Schema</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton>
                        {selectedSchema || "Select schema"}
                        <ChevronDown className="ml-auto" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
                      {schemas.filter(s => s !== selectedSchema).map((schema) => (
                        <DropdownMenuItem key={schema} onClick={() => handleSchemaChange(schema)}>
                          <span>{schema}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Tables</SidebarGroupLabel>
            <SidebarGroupAction className="mr-0.5">
              <Plus /> <span className="sr-only">Add table</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {tables.map((tableName) => (
                    <SidebarMenuItem key={tableName}>
                      <SidebarMenuButton asChild>
                        <Link href={`/tables/${tableName}`}>
                          <Table className="h-4 w-4" />
                          <span>{tableName}</span>
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction className="mr-0.5">
                            <MoreHorizontal />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem                             onClick={() => {
                              setTableToDelete(tableName);
                              // Use setTimeout to ensure the context menu is fully closed before opening the dialog
                              setTimeout(() => {
                                setIsDeleteDialogOpen(true);
                              }, 100);
                            }}>
                            <span>Drop table</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Delete Table Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the table{" "}
              <strong>{tableToDelete}</strong>?
              <br />
              This action cannot be undone and all data in this table will be
              permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteTable}
              disabled={deleteStatus.loading}
            >
              {deleteStatus.loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Schema Dialog */}
      <AlertDialog
        open={isCreateSchemaDialogOpen}
        onOpenChange={setIsCreateSchemaDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Schema</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the new schema.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <input
              type="text"
              value={newSchemaName}
              onChange={(e) => setNewSchemaName(e.target.value)}
              placeholder="Schema name"
              className="w-full px-3 py-2 border rounded-md"
              disabled={isCreatingSchema}
            />
            {createSchemaError && (
              <p className="text-red-500 text-sm mt-2">{createSchemaError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingSchema}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateSchema}
              disabled={isCreatingSchema}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isCreatingSchema ? "Creating..." : "Create Schema"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
