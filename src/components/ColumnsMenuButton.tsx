import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ListFilter } from "lucide-react";
import type { Column } from "react-data-grid";

interface ColumnsMenuButtonProps {
  allColumns: Column<Record<string, unknown>>[];
  visibleColumns: string[];
  onChange: (visible: string[]) => void;
}

export const ColumnsMenuButton: React.FC<ColumnsMenuButtonProps> = ({
  allColumns,
  visibleColumns,
  onChange,
}) => {
  const [search, setSearch] = useState("");

  const filteredColumns = useMemo(() => {
    if (!search) return allColumns;
    return allColumns.filter((col) =>
      col.name?.toString().toLowerCase().includes(search.toLowerCase()) ||
      col.key.toLowerCase().includes(search.toLowerCase())
    );
  }, [allColumns, search]);

  const allKeys = allColumns.map((col) => col.key);
  const allVisible = visibleColumns.length === allKeys.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilter className="h-4 w-4 mr-2" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="font-medium text-sm">Toggle columns</span>
          <button
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => onChange([])}
            type="button"
          >
            Deselect All
          </button>
        </div>
        <div className="px-2 pb-2">
          <input
            className="w-full rounded border px-2 py-1 text-xs bg-background"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenuItem
          onClick={() => onChange(allKeys)}
          className="text-xs text-muted-foreground cursor-pointer"
        >
          Select All
        </DropdownMenuItem>
        {filteredColumns.map((col) => (
          <DropdownMenuItem
            key={col.key}
            onClick={() => {
              if (visibleColumns.includes(col.key)) {
                onChange(visibleColumns.filter((k) => k !== col.key));
              } else {
                onChange([...visibleColumns, col.key]);
              }
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Checkbox checked={visibleColumns.includes(col.key)} />
            <span className="truncate text-xs">{col.name || col.key}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 