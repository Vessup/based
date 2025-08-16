"use client";

import { Copy, Edit2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomQuery } from "@/hooks/useCustomQueries";

interface QueryTabsProps {
  queries: CustomQuery[];
  activeQueryId: string | null;
  onSelectQuery: (queryId: string) => void;
  onCreateQuery: (name: string) => void;
  onRenameQuery: (queryId: string, name: string) => void;
  onDuplicateQuery: (queryId: string) => void;
  onDeleteQuery: (queryId: string) => void;
}

export function QueryTabs({
  queries,
  activeQueryId,
  onSelectQuery,
  onCreateQuery,
  onRenameQuery,
  onDuplicateQuery,
  onDeleteQuery,
}: QueryTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingQueryId, setRenamingQueryId] = useState<string | null>(null);
  const [newQueryName, setNewQueryName] = useState("");
  const [renameQueryName, setRenameQueryName] = useState("");

  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isCreating) {
      const timer = setTimeout(() => {
        createInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCreating]);

  useEffect(() => {
    if (isRenaming) {
      const timer = setTimeout(() => {
        const input = renameInputRef.current;
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRenaming]);

  const handleCreateQuery = useCallback(() => {
    setNewQueryName("New Query");
    setIsCreating(true);
  }, []);

  const handleConfirmCreate = useCallback(() => {
    if (!newQueryName.trim()) return;
    onCreateQuery(newQueryName.trim());
    setIsCreating(false);
    setNewQueryName("");
  }, [newQueryName, onCreateQuery]);

  const handleStartRename = useCallback(
    (queryId: string, currentName: string) => {
      setRenamingQueryId(queryId);
      setRenameQueryName(currentName);
      setIsRenaming(true);
    },
    [],
  );

  const handleConfirmRename = useCallback(() => {
    if (!renamingQueryId || !renameQueryName.trim()) return;
    onRenameQuery(renamingQueryId, renameQueryName.trim());
    setIsRenaming(false);
    setRenamingQueryId(null);
    setRenameQueryName("");
  }, [renamingQueryId, renameQueryName, onRenameQuery]);

  const handleCloseQuery = useCallback(
    (e: React.MouseEvent, queryId: string) => {
      e.stopPropagation();
      onDeleteQuery(queryId);
    },
    [onDeleteQuery],
  );

  return (
    <>
      <div className="flex items-center border-b bg-background">
        <div className="flex flex-1 overflow-x-auto">
          {queries.map((query) => (
            <ContextMenu key={query.id}>
              <ContextMenuTrigger>
                <div
                  className={`
                      flex items-center border-r cursor-pointer whitespace-nowrap min-w-0 max-w-48
                      ${
                        activeQueryId === query.id
                          ? "bg-background border-b-2 border-primary"
                          : "bg-muted/50 hover:bg-muted"
                      }
                    `}
                >
                  <button
                    type="button"
                    className="flex-1 px-3 py-2 text-left"
                    onClick={() => onSelectQuery(query.id)}
                  >
                    <span className="truncate text-sm" title={query.name}>
                      {query.name}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 mr-2 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => handleCloseQuery(e, query.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => handleStartRename(query.id, query.name)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDuplicateQuery(query.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => onDeleteQuery(query.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 border-l"
          onClick={handleCreateQuery}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Query Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Query</DialogTitle>
            <DialogDescription>
              Enter a name for your new SQL query.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="query-name">Query name</Label>
              <Input
                ref={createInputRef}
                id="query-name"
                value={newQueryName}
                onChange={(e) => setNewQueryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newQueryName.trim()) {
                    e.preventDefault();
                    handleConfirmCreate();
                  }
                }}
                placeholder="Enter query name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCreate}
              disabled={!newQueryName.trim()}
            >
              Create Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Query Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
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
                ref={renameInputRef}
                id="rename-query-name"
                value={renameQueryName}
                onChange={(e) => setRenameQueryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameQueryName.trim()) {
                    e.preventDefault();
                    handleConfirmRename();
                  }
                }}
                placeholder="Enter query name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={!renameQueryName.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
