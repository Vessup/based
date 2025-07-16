import { config } from "@/lib/config";
import { NextResponse } from "next/server";

export async function GET() {
  // Return the default connection config from the server
  return NextResponse.json({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });
}