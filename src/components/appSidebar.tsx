"use client";

import {
  Code,
  Database,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Table,
} from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import NProgress from "nprogress";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/themeToggle";

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
import { Button } from "@/components/ui/button";
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
import { useCustomQueries } from "@/hooks/useCustomQueries";
import {
  createDatabaseSchema,
  createTableAction,
  deleteDatabaseSchema,
  deleteTableAction,
  fetchDatabaseSchemas,
  fetchDatabaseTables,
  renameDatabaseSchema,
  renameTableAction,
} from "@/lib/actions";

export function AppSidebar() {
  const [schemas, setSchemas] = useState<string[]>(["public"]);
  const [selectedSchema, setSelectedSchema] = useState<string>(() => {
    // Try to get the schema from localStorage, default to "public"
    try {
      return localStorage.getItem("based-current-schema") || "public";
    } catch {
      return "public";
    }
  });
  const [tables, setTables] = useState<string[]>([]);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteStatus, _setDeleteStatus] = useState<{
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

  // State for creating a new table
  const [isCreateTableDialogOpen, setIsCreateTableDialogOpen] = useState(false);
  const [newTableNameForCreate, setNewTableNameForCreate] = useState("");
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [createTableError, setCreateTableError] = useState<string | null>(null);

  // State for schema management
  const [schemaToDelete, setSchemaToDelete] = useState<string | null>(null);
  const [isDeleteSchemaDialogOpen, setIsDeleteSchemaDialogOpen] =
    useState(false);
  const [schemaToRename, setSchemaToRename] = useState<string | null>(null);
  const [isRenameSchemaDialogOpen, setIsRenameSchemaDialogOpen] =
    useState(false);
  const [newSchemaNameForRename, setNewSchemaNameForRename] = useState("");
  const [schemaOperationStatus, setSchemaOperationStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  const params = useParams<{ table: string }>();
  const router = useRouter();
  const _searchParams = useSearchParams();
  const pathname = usePathname();

  // Query management
  const database = process.env.POSTGRES_DB || "based";
  const {
    queries,
    isLoaded: queriesLoaded,
    addQuery,
    updateQuery,
    deleteQuery,
    getQuery,
    duplicateQuery,
  } = useCustomQueries({ database, schema: selectedSchema });

  // Query dialog states
  const [isCreateQueryDialogOpen, setIsCreateQueryDialogOpen] = useState(false);
  const [isRenameQueryDialogOpen, setIsRenameQueryDialogOpen] = useState(false);
  const [newQueryName, setNewQueryName] = useState("");
  const [queryToRename, setQueryToRename] = useState<string | null>(null);
  const [renameQueryName, setRenameQueryName] = useState("");
  const [queryOperationStatus, setQueryOperationStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({ loading: false, error: null });

  // Refs for query dialogs
  const createQueryInputRef = useRef<HTMLInputElement>(null);
  const renameQueryInputRef = useRef<HTMLInputElement>(null);

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
      // Persist the selected schema to localStorage
      try {
        localStorage.setItem("based-current-schema", schema);
      } catch {
        // Ignore localStorage errors
      }
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

  // Listen for database connection updates and refresh data
  useEffect(() => {
    const handleConnectionUpdate = () => {
      console.log("Database connection updated, refreshing sidebar data");
      loadSchemas();
      loadTables();
    };

    window.addEventListener(
      "database-connection-updated",
      handleConnectionUpdate,
    );

    return () => {
      window.removeEventListener(
        "database-connection-updated",
        handleConnectionUpdate,
      );
    };
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

  // Focus create query input when dialog opens
  useEffect(() => {
    if (isCreateQueryDialogOpen) {
      const timer = setTimeout(() => {
        createQueryInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCreateQueryDialogOpen]);

  // Focus rename query input when dialog opens
  useEffect(() => {
    if (isRenameQueryDialogOpen) {
      const timer = setTimeout(() => {
        const input = renameQueryInputRef.current;
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRenameQueryDialogOpen]);

  // Function to handle table deletion
  const handleDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      const _result = await deleteTableAction(tableToDelete);

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
          try {
            localStorage.setItem("based-current-schema", "public");
          } catch {
            // Ignore localStorage errors
          }
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
          try {
            localStorage.setItem(
              "based-current-schema",
              newSchemaNameForRename.trim(),
            );
          } catch {
            // Ignore localStorage errors
          }
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

  // Function to handle table creation
  const handleCreateTable = async () => {
    if (!newTableNameForCreate.trim()) {
      setCreateTableError("Table name cannot be empty");
      return;
    }

    setIsCreatingTable(true);
    setCreateTableError(null);

    try {
      const result = await createTableAction(
        selectedSchema,
        newTableNameForCreate.trim(),
      );

      if (result.success) {
        // Refresh tables list
        await loadTables(selectedSchema);
        setIsCreateTableDialogOpen(false);
        setNewTableNameForCreate("");
        toast.success(`Table "${newTableNameForCreate}" created successfully`);
      } else {
        setCreateTableError(result.message || "Failed to create table");
      }
    } catch (error) {
      setCreateTableError(`Error: ${error}`);
    } finally {
      setIsCreatingTable(false);
    }
  };

  // Query management functions
  const handleCreateQuery = () => {
    setNewQueryName("New Query");
    setQueryOperationStatus({ loading: false, error: null });
    setIsCreateQueryDialogOpen(true);
  };

  const handleConfirmCreateQuery = () => {
    if (!newQueryName.trim()) return;
    try {
      const queryId = addQuery(newQueryName.trim(), "");
      setIsCreateQueryDialogOpen(false);
      setNewQueryName("");
      // Navigate to queries page with this query selected
      router.push(`/queries/${queryId}`);
    } catch (error) {
      setQueryOperationStatus({ loading: false, error: `Error: ${error}` });
    }
  };

  const handleStartRenameQuery = (queryId: string, currentName: string) => {
    setQueryToRename(queryId);
    setRenameQueryName(currentName);
    setQueryOperationStatus({ loading: false, error: null });
    setIsRenameQueryDialogOpen(true);
  };

  const handleConfirmRenameQuery = () => {
    if (!queryToRename || !renameQueryName.trim()) return;
    try {
      updateQuery(queryToRename, { name: renameQueryName.trim() });
      setIsRenameQueryDialogOpen(false);
      setQueryToRename(null);
      setRenameQueryName("");
    } catch (error) {
      setQueryOperationStatus({ loading: false, error: `Error: ${error}` });
    }
  };

  const handleDeleteQuery = (queryId: string) => {
    try {
      deleteQuery(queryId);
      // If we're currently on this query, navigate to homepage
      if (pathname === `/queries/${queryId}`) {
        router.push("/");
      }
    } catch (error) {
      console.error("Error deleting query:", error);
    }
  };

  const handleDuplicateQuery = (queryId: string) => {
    try {
      const newQueryId = duplicateQuery(queryId);
      if (newQueryId) {
        router.push(`/queries/${newQueryId}`);
      }
    } catch (error) {
      console.error("Error duplicating query:", error);
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
            <SidebarGroupLabel>Schemas</SidebarGroupLabel>
            <SidebarGroupAction
              className="mr-0.5"
              data-testid="add-schema-button"
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
                {schemas.map((schema) => (
                  <SidebarMenuItem
                    key={schema}
                    data-testid={`schema-item-${schema}`}
                  >
                    <SidebarMenuButton
                      isActive={schema === selectedSchema}
                      onClick={() => handleSchemaChange(schema)}
                    >
                      <Database className="h-4 w-4" />
                      <span>{schema}</span>
                    </SidebarMenuButton>
                    {schema !== "public" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction
                            className="mr-0.5"
                            data-testid={`schema-menu-action-${schema}`}
                          >
                            <MoreHorizontal />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem
                            data-testid={`rename-schema-${schema}`}
                            onClick={() => {
                              setSchemaToRename(schema);
                              setNewSchemaNameForRename(schema);
                              setSchemaOperationStatus({
                                loading: false,
                                error: null,
                              });
                              setTimeout(() => {
                                setIsRenameSchemaDialogOpen(true);
                              }, 100);
                            }}
                          >
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid={`delete-schema-${schema}`}
                            onClick={() => {
                              setSchemaToDelete(schema);
                              setSchemaOperationStatus({
                                loading: false,
                                error: null,
                              });
                              setTimeout(() => {
                                setIsDeleteSchemaDialogOpen(true);
                              }, 100);
                            }}
                          >
                            <span>Drop schema</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Queries</SidebarGroupLabel>
            <SidebarGroupAction className="mr-0.5" onClick={handleCreateQuery}>
              <Plus /> <span className="sr-only">Add Query</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {queriesLoaded &&
                  queries.map((query) => {
                    const isActive = pathname === `/queries/${query.id}`;
                    return (
                      <SidebarMenuItem key={query.id}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={`/queries/${query.id}`}>
                            <Code className="h-4 w-4" />
                            <span className="truncate" title={query.name}>
                              {query.name}
                            </span>
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
                              onClick={() =>
                                handleStartRenameQuery(query.id, query.name)
                              }
                            >
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicateQuery(query.id)}
                            >
                              <span>Duplicate</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteQuery(query.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })}
                {queriesLoaded && queries.length === 0 && (
                  <SidebarMenuItem>
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      Click + to create your first query.
                    </div>
                  </SidebarMenuItem>
                )}
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
            <SidebarGroupAction
              className="mr-0.5"
              data-testid="add-table-button"
              onClick={() => {
                setNewTableNameForCreate("");
                setCreateTableError(null);
                setIsCreateTableDialogOpen(true);
              }}
            >
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
        <DialogContent
          className="sm:max-w-[425px]"
          data-testid="create-schema-dialog"
        >
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
                data-testid="schema-name-input"
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
              data-testid="create-schema-submit-button"
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
        <AlertDialogContent data-testid="delete-schema-dialog">
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
              data-testid="delete-schema-confirm-button"
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
        <DialogContent
          className="sm:max-w-[425px]"
          data-testid="rename-schema-dialog"
        >
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
                data-testid="rename-schema-input"
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
              data-testid="rename-schema-submit-button"
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

      {/* Create Query Dialog */}
      <Dialog
        open={isCreateQueryDialogOpen}
        onOpenChange={setIsCreateQueryDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Query</DialogTitle>
            <DialogDescription>
              Enter a name for your new SQL query.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-query-name">Query name</Label>
              <Input
                ref={createQueryInputRef}
                id="new-query-name"
                value={newQueryName}
                onChange={(e) => setNewQueryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newQueryName.trim()) {
                    e.preventDefault();
                    handleConfirmCreateQuery();
                  }
                }}
                placeholder="Enter query name"
                disabled={queryOperationStatus.loading}
              />
              {queryOperationStatus.error && (
                <p className="text-red-500 text-sm mt-2">
                  {queryOperationStatus.error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateQueryDialogOpen(false)}
              disabled={queryOperationStatus.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCreateQuery}
              disabled={!newQueryName.trim() || queryOperationStatus.loading}
            >
              {queryOperationStatus.loading ? "Creating..." : "Create Query"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Query Dialog */}
      <Dialog
        open={isRenameQueryDialogOpen}
        onOpenChange={setIsRenameQueryDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Query</DialogTitle>
            <DialogDescription>
              Enter a new name for this query.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-query-name">Query name</Label>
              <Input
                ref={renameQueryInputRef}
                id="rename-query-name"
                value={renameQueryName}
                onChange={(e) => setRenameQueryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameQueryName.trim()) {
                    e.preventDefault();
                    handleConfirmRenameQuery();
                  }
                }}
                placeholder="Enter query name"
                disabled={queryOperationStatus.loading}
              />
              {queryOperationStatus.error && (
                <p className="text-red-500 text-sm mt-2">
                  {queryOperationStatus.error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameQueryDialogOpen(false)}
              disabled={queryOperationStatus.loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRenameQuery}
              disabled={!renameQueryName.trim() || queryOperationStatus.loading}
            >
              {queryOperationStatus.loading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Table Dialog */}
      <Dialog
        open={isCreateTableDialogOpen}
        onOpenChange={setIsCreateTableDialogOpen}
      >
        <DialogContent data-testid="create-table-dialog">
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Enter a name for your new table in the{" "}
              <strong>{selectedSchema}</strong> schema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="table-name">Table name</Label>
              <Input
                id="table-name"
                type="text"
                data-testid="table-name-input"
                value={newTableNameForCreate}
                onChange={(e) => setNewTableNameForCreate(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    newTableNameForCreate.trim() &&
                    !isCreatingTable
                  ) {
                    handleCreateTable();
                  }
                }}
                placeholder="Enter table name"
                disabled={isCreatingTable}
              />
              {createTableError && (
                <p className="text-sm text-red-500">{createTableError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateTableDialogOpen(false)}
              disabled={isCreatingTable}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTable}
              data-testid="create-table-submit-button"
              disabled={isCreatingTable || !newTableNameForCreate.trim()}
            >
              {isCreatingTable ? "Creating..." : "Create Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
