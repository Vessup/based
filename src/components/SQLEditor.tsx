"use client";

import { Button } from "@/components/ui/button";
import { getModifierKey } from "@/lib/utils";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { Loader2, Play, Save } from "lucide-react";
import { useTheme } from "next-themes";
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
  placeholder = "",
}: SQLEditorProps) {
  const [isDirty, setIsDirty] = useState(false);
  const { theme } = useTheme();

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
        </div>

        <div className="text-sm text-muted-foreground">
          {getModifierKey()}+Enter to execute
        </div>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 p-3">
        <CodeMirror
          value={query}
          onChange={(value) => handleQueryChange(value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={isReadOnly}
          theme={theme === "dark" ? oneDark : undefined}
          extensions={[sql()]}
          className="h-full border-0"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            highlightSelectionMatches: false,
          }}
          style={{
            minHeight: "200px",
            fontSize: "14px",
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>
    </div>
  );
}
