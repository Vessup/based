"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Save } from "lucide-react";
import { useCallback, useState } from "react";

interface SQLEditorProps {
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: (query: string) => void;
  onSave?: () => void;
  isExecuting?: boolean;
  isReadOnly?: boolean;
  placeholder?: string;
}

export function SQLEditor({
  query,
  onQueryChange,
  onExecute,
  onSave,
  isExecuting = false,
  isReadOnly = false,
  placeholder = "Enter your SQL query here...\n\nExample:\nSELECT * FROM users LIMIT 10;",
}: SQLEditorProps) {
  const [isDirty, setIsDirty] = useState(false);

  const handleQueryChange = useCallback(
    (value: string) => {
      onQueryChange(value);
      setIsDirty(true);
    },
    [onQueryChange],
  );

  const handleExecute = useCallback(() => {
    if (!query.trim() || isExecuting) return;
    onExecute(query);
  }, [query, onExecute, isExecuting]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
      setIsDirty(false);
    }
  }, [onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + Enter to execute
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleExecute, handleSave],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExecute}
            disabled={!query.trim() || isExecuting}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute
              </>
            )}
          </Button>
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              variant="outline"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Ctrl+Enter to execute • Ctrl+S to save
        </div>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 p-3">
        <Textarea
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={isReadOnly}
          className="h-full resize-none font-mono text-sm border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ minHeight: "200px" }}
        />
      </div>
    </div>
  );
}
