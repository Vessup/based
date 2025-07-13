"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DateInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onSave?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showTextInput?: boolean;
  showSaveCancel?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function DateInput({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "YYYY-MM-DD",
  disabled = false,
  showTextInput = true,
  showSaveCancel = false,
  className = "",
  autoFocus = false,
}: DateInputProps) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  // Auto-focus when component mounts
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && e.ctrlKey && onSave) {
        e.preventDefault();
        onSave();
      }
    };

    // Only add global listener if we have save/cancel functions
    if (showSaveCancel && (onSave || onCancel)) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [onSave, onCancel, showSaveCancel]);

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);
    onChange(inputValue || null);
  };

  const handleDatePickerChange = (date: Date | undefined) => {
    if (date) {
      // Create a UTC date from the selected date (treating the selected date as UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      setLocalValue(formattedDate);
      onChange(formattedDate);
    } else {
      setLocalValue("");
      onChange(null);
    }
    setIsPopoverOpen(false);
  };

  // Parse the date for the calendar component
  const getDateForCalendar = () => {
    if (!localValue || localValue === "") return undefined;
    try {
      // Parse YYYY-MM-DD format as UTC
      const dateStr = String(localValue);
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split("-").map(Number);
        // Create date in local timezone to display correctly in calendar
        return new Date(year, month - 1, day);
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && onCancel) {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && e.ctrlKey && onSave) {
      e.preventDefault();
      onSave();
    } else if (e.key === "Tab") {
      e.stopPropagation();
    }
  };

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
    }
  }, [onSave]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  if (!showTextInput) {
    // Calendar-only mode (for inline editing)
    return (
      <div className={`relative w-full h-full ${className}`}>
        <div className="w-full h-full px-2 flex items-center">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localValue ? (
                  localValue
                ) : (
                  <span className="text-muted-foreground">Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={getDateForCalendar()}
                onSelect={handleDatePickerChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {showSaveCancel && (
          <div className="absolute -right-14 top-1/2 -translate-y-1/2 flex gap-1 bg-background border rounded shadow-sm z-50">
            <button
              type="button"
              onClick={handleSave}
              className="p-1 hover:bg-green-100 rounded-l text-green-600 border-r"
              title="Save"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Save"
              >
                <path
                  d="M13.5 4.5L6 12L2.5 8.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 hover:bg-red-100 rounded-r text-red-600"
              title="Cancel (Esc)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Cancel"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Text input + calendar picker mode (for add record)
  return (
    <div className={`h-full flex items-center px-2 relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className="w-full h-full pr-8 px-2 py-1 border-0 outline-none bg-transparent"
        style={{
          minHeight: "35px",
          backgroundColor: "white",
          color: "black",
        }}
        value={localValue}
        onChange={handleTextInputChange}
        placeholder={placeholder}
        onKeyDown={handleInputKeyDown}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        disabled={disabled}
      />
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 h-full px-2"
            onClick={(e) => {
              e.stopPropagation();
            }}
            type="button"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={getDateForCalendar()}
            onSelect={handleDatePickerChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
