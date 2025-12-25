import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";
import { getConfig, buildDatabaseUrl, type AppConfig } from "@shared/config";

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getClient(): any;
}

class NeonDatabaseAdapter implements DatabaseAdapter {
  private pool: NeonPool | null = null;
  private db: any = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    neonConfig.webSocketConstructor = ws;
  }

  async connect(): Promise<void> {
    this.pool = new NeonPool({ connectionString: this.connectionString });
    this.db = drizzleNeon({ client: this.pool, schema });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }

  getClient(): any {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  getPool(): NeonPool | null {
    return this.pool;
  }
}

class PostgresDatabaseAdapter implements DatabaseAdapter {
  private pool: any = null;
  private db: any = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async connect(): Promise<void> {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    this.pool = new Pool({ connectionString: this.connectionString });
    this.db = drizzle(this.pool, { schema });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }

  getClient(): any {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  getPool(): any {
    return this.pool;
  }
}

let currentAdapter: DatabaseAdapter | null = null;

export function createDatabaseAdapter(config: AppConfig): DatabaseAdapter {
  const connectionString = buildDatabaseUrl(config);
  
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  switch (config.database.provider) {
    case "neon":
      return new NeonDatabaseAdapter(connectionString);
    case "postgres":
      return new PostgresDatabaseAdapter(connectionString);
    default:
      return new NeonDatabaseAdapter(connectionString);
  }
}

export async function initializeDatabase(): Promise<DatabaseAdapter> {
  if (currentAdapter) {
    return currentAdapter;
  }
  
  const config = getConfig();
  currentAdapter = createDatabaseAdapter(config);
  await currentAdapter.connect();
  return currentAdapter;
}

export function getDatabaseAdapter(): DatabaseAdapter {
  if (!currentAdapter) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return currentAdapter;
}

export function getDb() {
  return getDatabaseAdapter().getClient();
}

export async function closeDatabaseConnection(): Promise<void> {
  if (currentAdapter) {
    await currentAdapter.disconnect();
    currentAdapter = null;
  }
}

export { NeonDatabaseAdapter, PostgresDatabaseAdapter };
