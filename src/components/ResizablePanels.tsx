"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResizablePanelsProps {
  topPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  initialTopHeight?: number;
  minTopHeight?: number;
  maxTopHeight?: number;
  onHeightChange?: (height: number) => void;
  className?: string;
}

export function ResizablePanels({
  topPanel,
  bottomPanel,
  initialTopHeight = 50, // Percentage
  minTopHeight = 20,
  maxTopHeight = 80,
  onHeightChange,
  className = "",
}: ResizablePanelsProps) {
  const [topHeight, setTopHeight] = useState(initialTopHeight);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startY.current = e.clientY;
      startHeight.current = topHeight;
    },
    [topHeight],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const deltaY = e.clientY - startY.current;
      const deltaPercentage = (deltaY / containerRect.height) * 100;

      let newHeight = startHeight.current + deltaPercentage;
      newHeight = Math.max(minTopHeight, Math.min(maxTopHeight, newHeight));

      setTopHeight(newHeight);
      onHeightChange?.(newHeight);
    },
    [isDragging, minTopHeight, maxTopHeight, onHeightChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* Top Panel */}
      <div style={{ height: `${topHeight}%` }} className="min-h-0">
        {topPanel}
      </div>

      {/* Resizable Divider */}
      <div
        className={`
          h-1 bg-border cursor-row-resize hover:bg-border/80 transition-colors
          relative group
          ${isDragging ? "bg-primary" : ""}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Invisible expanded hit area for easier dragging */}
        <div className="absolute inset-x-0 -top-1 -bottom-1 w-full" />

        {/* Visual indicator on hover */}
        <div className="absolute inset-x-0 top-0 w-full h-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Bottom Panel */}
      <div style={{ height: `${100 - topHeight}%` }} className="min-h-0">
        {bottomPanel}
      </div>
    </div>
  );
}
