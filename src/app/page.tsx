"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  checkDatabaseConnectionHealth,
  fetchDatabaseStats,
  fetchDatabaseStatsWithConfig,
  testCustomDatabaseConnection,
} from "@/lib/actions";
import { Database, Plug, Settings, TrendingUp } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

interface DatabaseHealth {
  connected: boolean;
  serverTime?: string;
  serverVersion?: string;
  message: string;
}

interface DatabaseStats {
  success: boolean;
  cacheHitRatio: number | null;
  activeConnections: number | null;
  databaseSize: string;
  tableActivity: Array<{
    tablename: string;
    seq_scan: number;
    seq_tup_read: number;
    idx_scan: number;
    idx_tup_fetch: number;
    n_tup_ins: number;
    n_tup_upd: number;
    n_tup_del: number;
  }>;
  tableSizes: Array<{
    tablename: string;
    size: string;
  }>;
  missingIndexes: Array<{
    tablename: string;
    seq_scan: number;
    seq_tup_read: number;
    avg_seq_read: number;
  }>;
  unusedIndexes: Array<{
    tablename: string;
    indexname: string;
    idx_scan: number;
  }>;
  slowQueries: Array<{
    query: string;
    state: string;
    query_start: string;
    duration_seconds: number;
  }>;
  error?: string;
}

interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface ConnectionFormProps {
  connectionConfig: ConnectionConfig;
  setConnectionConfig: React.Dispatch<React.SetStateAction<ConnectionConfig>>;
  connecting: boolean;
  health: DatabaseHealth | null;
  onConnect: () => void;
}

const ConnectionForm = memo(
  ({
    connectionConfig,
    setConnectionConfig,
    connecting,
    health,
    onConnect,
  }: ConnectionFormProps) => (
    <div className="w-full space-y-6 p-6 rounded-lg border bg-card">
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

      <div className="flex gap-2">
        <Button
          onClick={onConnect}
          disabled={connecting}
          className="flex items-center gap-2"
        >
          <Plug className={`h-4 w-4 ${connecting ? "animate-pulse" : ""}`} />
          {connecting ? "Connecting..." : "Connect"}
        </Button>
      </div>

      {health && !health.connected && (
        <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{health.message}</p>
        </div>
      )}
    </div>
  ),
);

ConnectionForm.displayName = "ConnectionForm";

export default function Home() {
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    host: "",
    port: 5432,
    user: "",
    password: "",
    database: "",
  });

  // Fetch default config from server
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config) => {
        setConnectionConfig(config);
      })
      .catch((error) => {
        console.error("Failed to fetch config:", error);
      });
  }, []);

  // Connect with default config on initial load
  const connectWithDefaultConfig = useCallback(async () => {
    try {
      setLoading(true);
      const healthResult = await checkDatabaseConnectionHealth();
      setHealth(healthResult);

      if (healthResult.connected) {
        const statsResult = await fetchDatabaseStats();
        setStats(statsResult);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error("Error connecting to database:", error);
      setHealth({
        connected: false,
        message: `Connection failed: ${error}`,
      });
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect with custom config from form
  const connectWithCustomConfig = useCallback(async () => {
    try {
      setConnecting(true);
      const healthResult = await testCustomDatabaseConnection(connectionConfig);
      setHealth(healthResult);

      if (healthResult.connected) {
        const statsResult =
          await fetchDatabaseStatsWithConfig(connectionConfig);
        setStats(statsResult);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error("Error connecting to database:", error);
      setHealth({
        connected: false,
        message: `Connection failed: ${error}`,
      });
      setStats(null);
    } finally {
      setConnecting(false);
    }
  }, [connectionConfig]);

  // Connect with default config on initial load
  useEffect(() => {
    connectWithDefaultConfig();
  }, [connectWithDefaultConfig]);

  const ConnectionIndicator = () => (
    <div className="w-full flex items-center gap-3 p-4 rounded-lg border bg-card">
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
      {health?.serverVersion && (
        <span className="text-sm text-muted-foreground">
          {health.serverVersion.split(" ").slice(0, 2).join(" ")}
        </span>
      )}
    </div>
  );

  const DatabaseStatsSection = () => {
    if (!health?.connected || !stats?.success) {
      return null;
    }

    return (
      <div className="w-full space-y-6 p-6 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            Database Performance & Statistics
          </h3>
        </div>

        {/* Quick Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Cache Hit Ratio</p>
            <p
              className={`text-2xl font-semibold ${
                stats.cacheHitRatio && stats.cacheHitRatio > 95
                  ? "text-green-600"
                  : "text-amber-600"
              }`}
            >
              {stats.cacheHitRatio ? `${stats.cacheHitRatio}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.cacheHitRatio && stats.cacheHitRatio > 95
                ? "Good"
                : "Should be >95%"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active Connections</p>
            <p className="text-2xl font-semibold">
              {stats.activeConnections ?? "N/A"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Database Size</p>
            <p className="text-2xl font-semibold">{stats.databaseSize}</p>
          </div>
        </div>

        <Separator />

        {/* Table Activity */}
        {stats.tableActivity.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold">Most Active Tables</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Table</th>
                    <th className="text-right p-2">Seq Scans</th>
                    <th className="text-right p-2">Index Scans</th>
                    <th className="text-right p-2">Inserts</th>
                    <th className="text-right p-2">Updates</th>
                    <th className="text-right p-2">Deletes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tableActivity.map((table) => (
                    <tr key={table.tablename} className="border-b">
                      <td className="p-2 font-mono">{table.tablename}</td>
                      <td className="text-right p-2">
                        {table.seq_scan.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        {table.idx_scan.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        {table.n_tup_ins.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        {table.n_tup_upd.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        {table.n_tup_del.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table Sizes */}
        {stats.tableSizes.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold">Largest Tables</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.tableSizes.map((table) => (
                <div
                  key={table.tablename}
                  className="flex justify-between items-center p-2 bg-muted/50 rounded"
                >
                  <span className="font-mono text-sm">{table.tablename}</span>
                  <span className="text-sm font-semibold">{table.size}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Warnings */}
        {stats.missingIndexes.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-amber-600">
              Tables with High Sequential Scans
            </h4>
            <p className="text-sm text-muted-foreground">
              These tables might benefit from indexes
            </p>
            <div className="space-y-2">
              {stats.missingIndexes.map((table) => (
                <div
                  key={table.tablename}
                  className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-950 rounded"
                >
                  <span className="font-mono text-sm">{table.tablename}</span>
                  <span className="text-sm">
                    {table.seq_scan} scans, avg {table.avg_seq_read} rows/scan
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unused Indexes */}
        {stats.unusedIndexes.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-blue-600">
              Unused Indexes
            </h4>
            <p className="text-sm text-muted-foreground">
              Consider dropping these indexes to save space
            </p>
            <div className="space-y-2">
              {stats.unusedIndexes.map((index) => (
                <div
                  key={index.indexname}
                  className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950 rounded"
                >
                  <span className="font-mono text-sm">{index.indexname}</span>
                  <span className="text-sm text-muted-foreground">
                    on {index.tablename}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slow Queries */}
        {stats.slowQueries.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-red-600">
              Long-Running Queries
            </h4>
            <div className="space-y-2">
              {stats.slowQueries.map((query, idx) => (
                <div
                  key={`${query.query_start}-${idx}`}
                  className="p-2 bg-red-50 dark:bg-red-950 rounded space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      Running for {Math.round(query.duration_seconds)}s
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {query.state}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {query.query.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 animate-pulse" />
          <span>Connecting to database...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Database Dashboard</h1>
      </header>
      <div className="flex-1 p-6">
        <div className="max-w-none space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Based</h1>
            <p className="text-lg text-muted-foreground">
              Browser-based database UI for PostgreSQL
            </p>
          </div>

          <div className="space-y-6">
            <ConnectionIndicator />
            <ConnectionForm
              connectionConfig={connectionConfig}
              setConnectionConfig={setConnectionConfig}
              connecting={connecting}
              health={health}
              onConnect={connectWithCustomConfig}
            />
            <DatabaseStatsSection />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
