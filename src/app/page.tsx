"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  checkDatabaseConnectionHealth,
  fetchDatabaseStats,
} from "@/lib/actions";
import { config } from "@/lib/db";
import { Database, RefreshCw, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface DatabaseHealth {
  connected: boolean;
  serverTime?: string;
  serverVersion?: string;
  message: string;
}

interface DatabaseStats {
  success: boolean;
  databaseSize: string;
  tableCount: number;
  schemaCount: number;
  databaseName: string;
  currentUser: string;
  error?: string;
}

interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export default function Home() {
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  const checkConnection = useCallback(async () => {
    try {
      setRefreshing(true);
      const healthResult = await checkDatabaseConnectionHealth();
      setHealth(healthResult);

      if (healthResult.connected) {
        const statsResult = await fetchDatabaseStats();
        setStats(statsResult);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      setHealth({
        connected: false,
        message: `Connection check failed: ${error}`,
      });
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const ConnectionIndicator = () => (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            health?.connected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="font-medium">
          {health?.connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={checkConnection}
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );

  const ConnectionForm = () => (
    <div className="space-y-6 p-6 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Database Connection</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            value={connectionConfig.host}
            onChange={(e) =>
              setConnectionConfig((prev) => ({ ...prev, host: e.target.value }))
            }
            placeholder="localhost"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={connectionConfig.port}
            onChange={(e) =>
              setConnectionConfig((prev) => ({
                ...prev,
                port: Number(e.target.value),
              }))
            }
            placeholder="5432"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user">User</Label>
          <Input
            id="user"
            value={connectionConfig.user}
            onChange={(e) =>
              setConnectionConfig((prev) => ({ ...prev, user: e.target.value }))
            }
            placeholder="postgres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={connectionConfig.password}
            onChange={(e) =>
              setConnectionConfig((prev) => ({
                ...prev,
                password: e.target.value,
              }))
            }
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="database">Database</Label>
          <Input
            id="database"
            value={connectionConfig.database}
            onChange={(e) =>
              setConnectionConfig((prev) => ({
                ...prev,
                database: e.target.value,
              }))
            }
            placeholder="based"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> Connection settings are read from environment
          variables and cannot be modified from this interface. To change
          connection settings, update your environment variables and restart the
          application.
        </p>
      </div>

      {health && !health.connected && (
        <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{health.message}</p>
        </div>
      )}
    </div>
  );

  const DatabaseStatsSection = () => {
    if (!health?.connected || !stats?.success) {
      return null;
    }

    return (
      <div className="space-y-6 p-6 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Database Statistics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Database Name</p>
            <p className="text-2xl font-semibold">{stats.databaseName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Database Size</p>
            <p className="text-2xl font-semibold">{stats.databaseSize}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Tables</p>
            <p className="text-2xl font-semibold">{stats.tableCount}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Schemas</p>
            <p className="text-2xl font-semibold">{stats.schemaCount}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current User</p>
            <p className="text-2xl font-semibold">{stats.currentUser}</p>
          </div>

          {health.serverTime && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Server Time</p>
              <p className="text-sm font-mono">
                {new Date(health.serverTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {health.serverVersion && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">PostgreSQL Version</p>
            <p className="text-sm font-mono mt-1">{health.serverVersion}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Checking database connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Based</h1>
          <p className="text-lg text-muted-foreground">
            Browser-based database UI for PostgreSQL
          </p>
        </div>

        <div className="space-y-6">
          <ConnectionIndicator />
          <ConnectionForm />
          <DatabaseStatsSection />
        </div>
      </div>
    </div>
  );
}
