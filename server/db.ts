import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getConfig, buildDatabaseUrl } from "@shared/config";

neonConfig.webSocketConstructor = ws;

function createDatabase() {
  const config = getConfig();
  const connectionString = buildDatabaseUrl(config);
  
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database? " +
      "Set DATABASE_URL or individual PGHOST, PGUSER, PGPASSWORD, PGDATABASE variables.",
    );
  }
  
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema });
  
  return { pool, db };
}

const { pool, db } = createDatabase();

export { pool, db };
export { initializeDatabase, getDb, closeDatabaseConnection, getDatabaseAdapter } from './database/index';
