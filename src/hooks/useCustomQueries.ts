"use client";

import { useCallback, useEffect, useState } from "react";

export interface CustomQuery {
  id: string;
  name: string;
  query: string;
  createdAt: Date;
  lastModified: Date;
}

interface UseCustomQueriesOptions {
  database: string;
  schema: string;
}

/**
 * Custom hook for managing SQL queries in local storage
 * Queries are namespaced by database and schema
 */
export function useCustomQueries({
  database,
  schema,
}: UseCustomQueriesOptions) {
  const [queries, setQueries] = useState<CustomQuery[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate storage key based on database and schema
  const storageKey = `based-queries-${database}-${schema}`;

  // Load queries from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const queriesWithDates = parsed.map(
          (q: {
            id: string;
            name: string;
            query: string;
            createdAt: string;
            lastModified: string;
          }) => ({
            ...q,
            createdAt: new Date(q.createdAt),
            lastModified: new Date(q.lastModified),
          }),
        );
        setQueries(queriesWithDates);
      }
    } catch (error) {
      console.error("Error loading queries from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Save queries to localStorage whenever queries change
  const saveQueries = useCallback(
    (newQueries: CustomQuery[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newQueries));
        setQueries(newQueries);
      } catch (error) {
        console.error("Error saving queries to localStorage:", error);
      }
    },
    [storageKey],
  );

  // Add a new query
  const addQuery = useCallback(
    (name: string, query: string) => {
      const newQuery: CustomQuery = {
        id: `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        query,
        createdAt: new Date(),
        lastModified: new Date(),
      };

      const newQueries = [...queries, newQuery];
      saveQueries(newQueries);
      return newQuery.id;
    },
    [queries, saveQueries],
  );

  // Update an existing query
  const updateQuery = useCallback(
    (id: string, updates: Partial<Pick<CustomQuery, "name" | "query">>) => {
      const newQueries = queries.map((q) =>
        q.id === id ? { ...q, ...updates, lastModified: new Date() } : q,
      );
      saveQueries(newQueries);
    },
    [queries, saveQueries],
  );

  // Delete a query
  const deleteQuery = useCallback(
    (id: string) => {
      const newQueries = queries.filter((q) => q.id !== id);
      saveQueries(newQueries);
    },
    [queries, saveQueries],
  );

  // Get a specific query by ID
  const getQuery = useCallback(
    (id: string) => {
      return queries.find((q) => q.id === id);
    },
    [queries],
  );

  // Duplicate a query
  const duplicateQuery = useCallback(
    (id: string) => {
      const original = getQuery(id);
      if (!original) return null;

      return addQuery(`${original.name} (Copy)`, original.query);
    },
    [getQuery, addQuery],
  );

  return {
    queries,
    isLoaded,
    addQuery,
    updateQuery,
    deleteQuery,
    getQuery,
    duplicateQuery,
  };
}
