"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Code,
  Database,
  Edit2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Table,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import NProgress from "nprogress";
import { useCallback, useEffect, useRef, useState } from "react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  createDatabaseSchema,
  deleteDatabaseSchema,
  deleteTableAction,
  fetchDatabaseSchemas,
  fetchDatabaseTables,
  renameDatabaseSchema,
  renameTableAction,
} from "@/lib/actions";
import { useParams } from "next/navigation";

export function AppSidebar() {
  const [schemas, setSchemas] = useState<string[]>(["public"]);
  const [selectedSchema, setSelectedSchema] = useState<string>("public");
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

  // State for table renaming
  const [tableToRename, setTableToRename] = useState<string | null>(null);
  const [isRenameTableDialogOpen, setIsRenameTableDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [isRenamingTable, setIsRenamingTable] = useState(false);
  const [renameTableError, setRenameTableError] = useState<string | null>(null);

  // State for creating a new schema
  const [isCreateSchemaDialogOpen, setIsCreateSchemaDialogOpen] =
    useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [isCreatingSchema, setIsCreatingSchema] = useState(false);
  const [createSchemaError, setCreateSchemaError] = useState<string | null>(
    null,
  );

  // State for schema management
  const [schemaToDelete, setSchemaToDelete] = useState<string | null>(null);
  const [isDeleteSchemaDialogOpen, setIsDeleteSchemaDialogOpen] =
    useState(false);
  const [schemaToRename, setSchemaToRename] = useState<string | null>(null);
  const [isRenameSchemaDialogOpen, setIsRenameSchemaDialogOpen] =
    useState(false);
  const [newSchemaNameForRename, setNewSchemaNameForRename] = useState("");
  const [schemaPopoverOpen, setSchemaPopoverOpen] = useState(false);
  const [schemaOperationStatus, setSchemaOperationStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  const params = useParams<{ table: string }>();

  // State for table search
  const [tableSearch, setTableSearch] = useState("");

  // Refs for dialog inputs
  const createSchemaInputRef = useRef<HTMLInputElement>(null);
  const renameSchemaInputRef = useRef<HTMLInputElement>(null);
  const renameTableInputRef = useRef<HTMLInputElement>(null);

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
  const loadTables = useCallback(
    async (schema = selectedSchema) => {
      try {
        NProgress.start();
        setRefreshing(true);
        const result = await fetchDatabaseTables(schema);

        if (result.error) {
          setError(result.error);
        } else {
          setTables(result.tables);
          setError(null);
        }
      } catch (err) {
        console.error(
          `Failed to fetch database tables from schema ${schema}:`,
          err,
        );
        setError(`Failed to load database tables from schema ${schema}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
        NProgress.done();
      }
    },
    [selectedSchema],
  );

  // Handle schema change
  const handleSchemaChange = (schema: string) => {
    if (schema === "create_new") {
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
      setCreateSchemaError("Schema name cannot be empty");
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
        setNewSchemaName("");
      } else {
        setCreateSchemaError(result.message || "Failed to create schema");
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

  // Focus create schema input when dialog opens
  useEffect(() => {
    if (isCreateSchemaDialogOpen) {
      const timer = setTimeout(() => {
        createSchemaInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCreateSchemaDialogOpen]);

  // Focus rename schema input when dialog opens
  useEffect(() => {
    if (isRenameSchemaDialogOpen) {
      const timer = setTimeout(() => {
        const input = renameSchemaInputRef.current;
        if (input) {
          input.focus();
          // Set cursor at the end
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRenameSchemaDialogOpen]);

  // Focus rename table input when dialog opens
  useEffect(() => {
    if (isRenameTableDialogOpen) {
      const timer = setTimeout(() => {
        const input = renameTableInputRef.current;
        if (input) {
          input.focus();
          // Set cursor at the end
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRenameTableDialogOpen]);

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

  // Function to handle schema deletion
  const handleDeleteSchema = async () => {
    if (!schemaToDelete) return;

    try {
      setSchemaOperationStatus({ loading: true, error: null });
      const result = await deleteDatabaseSchema(schemaToDelete);

      if (result.success) {
        // If we deleted the selected schema, switch to public
        if (schemaToDelete === selectedSchema) {
          setSelectedSchema("public");
        }
        // Refresh schemas list
        await loadSchemas();
        setIsDeleteSchemaDialogOpen(false);
        setSchemaToDelete(null);
        setSchemaOperationStatus({ loading: false, error: null });
      } else {
        setSchemaOperationStatus({ loading: false, error: result.message });
      }
    } catch (error) {
      setSchemaOperationStatus({ loading: false, error: `Error: ${error}` });
    }
  };

  // Function to handle schema renaming
  const handleRenameSchema = async () => {
    if (!schemaToRename || !newSchemaNameForRename.trim()) return;

    try {
      setSchemaOperationStatus({ loading: true, error: null });
      const result = await renameDatabaseSchema(
        schemaToRename,
        newSchemaNameForRename.trim(),
      );

      if (result.success) {
        // If we renamed the selected schema, update selection
        if (schemaToRename === selectedSchema) {
          setSelectedSchema(newSchemaNameForRename.trim());
        }
        // Refresh schemas list
        await loadSchemas();
        setIsRenameSchemaDialogOpen(false);
        setSchemaToRename(null);
        setNewSchemaNameForRename("");
        setSchemaOperationStatus({ loading: false, error: null });
      } else {
        setSchemaOperationStatus({ loading: false, error: result.message });
      }
    } catch (error) {
      setSchemaOperationStatus({ loading: false, error: `Error: ${error}` });
    }
  };

  // Function to handle table renaming
  const handleRenameTable = async () => {
    if (!tableToRename || !newTableName.trim()) return;

    try {
      setIsRenamingTable(true);
      setRenameTableError(null);
      const result = await renameTableAction(
        tableToRename,
        newTableName.trim(),
      );

      if (result.success) {
        // Refresh tables list
        await loadTables();
        setIsRenameTableDialogOpen(false);
        setTableToRename(null);
        setNewTableName("");
      } else {
        setRenameTableError(result.message || "Failed to rename table");
      }
    } catch (error) {
      setRenameTableError(`Error: ${error}`);
    } finally {
      setIsRenamingTable(false);
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
            <SidebarGroupContent className="flex justify-center gap-3">
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
            <SidebarGroupAction
              className="mr-0.5"
              onClick={() => {
                setNewSchemaName("");
                setCreateSchemaError(null);
                setIsCreateSchemaDialogOpen(true);
              }}
            >
              <Plus /> <span className="sr-only">Add Schema</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Popover
                    open={schemaPopoverOpen}
                    onOpenChange={setSchemaPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <SidebarMenuButton>
                        {selectedSchema || "Select schema"}
                        <ChevronDown className="ml-auto" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      sideOffset={4}
                    >
                      <div className="max-h-[300px] overflow-y-auto">
                        {schemas.map((schema) => (
                          <div
                            key={schema}
                            className={`group flex items-center justify-between px-3 py-2 hover:bg-accent ${
                              schema === selectedSchema ? "bg-accent" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="flex-1 text-left cursor-pointer"
                              onClick={() => {
                                handleSchemaChange(schema);
                                setSchemaPopoverOpen(false);
                              }}
                            >
                              {schema}
                            </button>
                            {schema !== "public" && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSchemaPopoverOpen(false);
                                    setSchemaToRename(schema);
                                    setNewSchemaNameForRename(schema);
                                    setSchemaOperationStatus({
                                      loading: false,
                                      error: null,
                                    });
                                    setIsRenameSchemaDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSchemaPopoverOpen(false);
                                    setSchemaToDelete(schema);
                                    setSchemaOperationStatus({
                                      loading: false,
                                      error: null,
                                    });
                                    setIsDeleteSchemaDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Queries</SidebarGroupLabel>
            <SidebarGroupAction
              className="mr-0.5"
              onClick={() => {
                // Navigate to queries page and let user create new query there
                window.location.href = "/queries";
              }}
            >
              <Plus /> <span className="sr-only">Add Query</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      params.table === undefined &&
                      typeof window !== "undefined" &&
                      window.location.pathname === "/queries"
                    }
                  >
                    <Link href="/queries">
                      <Code className="h-4 w-4" />
                      <span>Query Workspace</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Tables</SidebarGroupLabel>
            <div className="pb-2">
              <Input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search tables..."
                aria-label="Search tables"
              />
            </div>
            <SidebarGroupAction className="mr-0.5">
              <Plus /> <span className="sr-only">Add table</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {tables
                  .filter((tableName) =>
                    tableName.toLowerCase().includes(tableSearch.toLowerCase()),
                  )
                  .map((tableName) => (
                    <SidebarMenuItem key={tableName}>
                      <SidebarMenuButton
                        asChild
                        isActive={params.table === tableName}
                      >
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
                          <DropdownMenuItem
                            onClick={() => {
                              setTableToRename(tableName);
                              setNewTableName(tableName);
                              setRenameTableError(null);
                              // Use setTimeout to ensure the dropdown is fully closed before opening the dialog
                              setTimeout(() => {
                                setIsRenameTableDialogOpen(true);
                              }, 100);
                            }}
                          >
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTableToDelete(tableName);
                              // Use setTimeout to ensure the context menu is fully closed before opening the dialog
                              setTimeout(() => {
                                setIsDeleteDialogOpen(true);
                              }, 100);
                            }}
                          >
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
      <Dialog
        open={isCreateSchemaDialogOpen}
        onOpenChange={setIsCreateSchemaDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Schema</DialogTitle>
            <DialogDescription>
              Enter a name for the new schema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="schema-name">Schema name</Label>
              <Input
                ref={createSchemaInputRef}
                id="schema-name"
                type="text"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    newSchemaName.trim() &&
                    !isCreatingSchema
                  ) {
                    e.preventDefault();
                    handleCreateSchema();
                  }
                }}
                placeholder="Enter schema name"
                disabled={isCreatingSchema}
              />
              {createSchemaError && (
                <p className="text-red-500 text-sm mt-2">{createSchemaError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSchemaDialogOpen(false)}
              disabled={isCreatingSchema}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchema}
              disabled={isCreatingSchema}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isCreatingSchema ? "Creating..." : "Create Schema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schema Dialog */}
      <AlertDialog
        open={isDeleteSchemaDialogOpen}
        onOpenChange={setIsDeleteSchemaDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schema</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the schema{" "}
              <strong>{schemaToDelete}</strong>?
              <br />
              This will delete all tables and data within this schema. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={schemaOperationStatus.loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteSchema}
              disabled={schemaOperationStatus.loading}
            >
              {schemaOperationStatus.loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Schema Dialog */}
      <Dialog
        open={isRenameSchemaDialogOpen}
        onOpenChange={setIsRenameSchemaDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Schema</DialogTitle>
            <DialogDescription>
              Enter a new name for the schema <strong>{schemaToRename}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-schema-name">New schema name</Label>
              <Input
                ref={renameSchemaInputRef}
                id="new-schema-name"
                type="text"
                value={newSchemaNameForRename}
                onChange={(e) => setNewSchemaNameForRename(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    newSchemaNameForRename.trim() &&
                    !schemaOperationStatus.loading
                  ) {
                    e.preventDefault();
                    handleRenameSchema();
                  }
                }}
                placeholder="Enter new schema name"
                disabled={schemaOperationStatus.loading}
              />
              {schemaOperationStatus.error && (
                <p className="text-red-500 text-sm mt-2">
                  {schemaOperationStatus.error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameSchemaDialogOpen(false)}
              disabled={schemaOperationStatus.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSchema}
              disabled={
                schemaOperationStatus.loading || !newSchemaNameForRename.trim()
              }
            >
              {schemaOperationStatus.loading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Table Dialog */}
      <Dialog
        open={isRenameTableDialogOpen}
        onOpenChange={setIsRenameTableDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Table</DialogTitle>
            <DialogDescription>
              Enter a new name for the table <strong>{tableToRename}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-table-name">New table name</Label>
              <Input
                ref={renameTableInputRef}
                id="new-table-name"
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    newTableName.trim() &&
                    !isRenamingTable
                  ) {
                    e.preventDefault();
                    handleRenameTable();
                  }
                }}
                placeholder="Enter new table name"
                disabled={isRenamingTable}
              />
              {renameTableError && (
                <p className="text-red-500 text-sm mt-2">{renameTableError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameTableDialogOpen(false)}
              disabled={isRenamingTable}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameTable}
              disabled={isRenamingTable || !newTableName.trim()}
            >
              {isRenamingTable ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
