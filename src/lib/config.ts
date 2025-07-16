// Only load dotenvx on the server side
if (typeof window === "undefined") {
  require("@dotenvx/dotenvx").config({ ignore: ["MISSING_ENV_FILE"] });
}

export const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DB || "based",
};
