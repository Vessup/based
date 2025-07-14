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
