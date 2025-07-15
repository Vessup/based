import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Detect if the user is on macOS
export function isMac() {
  if (typeof window === "undefined") return false;
  return navigator.userAgent.toLowerCase().includes("mac");
}

// Get the appropriate modifier key name based on the platform
export function getModifierKey() {
  return isMac() ? "⌘" : "Ctrl";
}

/**
 * Safely extracts the ID from a row object, handling multiple possible ID field names
 * @param row The row object to extract ID from
 * @returns The ID as a string, or null if no valid ID found
 */
export function getRowId(row: Record<string, unknown>): string | null {
  // Try common ID field names in order of preference
  const idFields = ["id", "ID", "uuid", "UUID"];

  for (const field of idFields) {
    const value = row[field];
    if (value !== null && value !== undefined) {
      return String(value);
    }
  }

  // If no standard ID field found, warn and return null
  console.warn("No valid ID field found in row:", row);
  return null;
}

/**
 * Type guard to check if a row has a valid ID
 * @param row The row object to check
 * @returns True if the row has a valid ID
 */
export function hasValidId(row: Record<string, unknown>): boolean {
  return getRowId(row) !== null;
}
