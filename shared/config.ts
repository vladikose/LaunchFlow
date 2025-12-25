import { z } from "zod";

export const DatabaseProviderSchema = z.enum(["neon", "postgres"]).default("neon");
export const StorageProviderSchema = z.enum(["gcs-replit", "s3", "local"]).default("gcs-replit");
export const SessionStoreSchema = z.enum(["postgres", "redis", "memory"]).default("postgres");
export const EmailProviderSchema = z.enum(["resend", "smtp", "none"]).default("none");

export const AppConfigSchema = z.object({
  database: z.object({
    provider: DatabaseProviderSchema,
    url: z.string().optional(),
    host: z.string().optional(),
    port: z.coerce.number().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    name: z.string().optional(),
  }),
  storage: z.object({
    provider: StorageProviderSchema,
    publicPaths: z.string().optional(),
    privateDir: z.string().optional(),
    s3Endpoint: z.string().optional(),
    s3Region: z.string().optional(),
    s3AccessKey: z.string().optional(),
    s3SecretKey: z.string().optional(),
    s3Bucket: z.string().optional(),
    localPath: z.string().optional(),
  }),
  session: z.object({
    store: SessionStoreSchema,
    secret: z.string().min(1),
    redisUrl: z.string().optional(),
  }),
  email: z.object({
    provider: EmailProviderSchema,
    resendApiKey: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.coerce.number().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    fromEmail: z.string().optional(),
  }),
  translation: z.object({
    deeplApiKey: z.string().optional(),
    enabled: z.boolean().default(false),
  }),
  github: z.object({
    enabled: z.boolean().default(false),
  }),
  app: z.object({
    nodeEnv: z.enum(["development", "production", "test"]).default("development"),
    port: z.coerce.number().default(5000),
    baseUrl: z.string().optional(),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type DatabaseProvider = z.infer<typeof DatabaseProviderSchema>;
export type StorageProvider = z.infer<typeof StorageProviderSchema>;
export type SessionStore = z.infer<typeof SessionStoreSchema>;
export type EmailProvider = z.infer<typeof EmailProviderSchema>;

export function loadConfig(): AppConfig {
  const config = AppConfigSchema.parse({
    database: {
      provider: process.env.DB_PROVIDER || "neon",
      url: process.env.DATABASE_URL,
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      name: process.env.PGDATABASE,
    },
    storage: {
      provider: process.env.STORAGE_PROVIDER || "gcs-replit",
      publicPaths: process.env.PUBLIC_OBJECT_SEARCH_PATHS,
      privateDir: process.env.PRIVATE_OBJECT_DIR,
      s3Endpoint: process.env.S3_ENDPOINT,
      s3Region: process.env.S3_REGION,
      s3AccessKey: process.env.S3_ACCESS_KEY,
      s3SecretKey: process.env.S3_SECRET_KEY,
      s3Bucket: process.env.S3_BUCKET,
      localPath: process.env.LOCAL_STORAGE_PATH || "./uploads",
    },
    session: {
      store: process.env.SESSION_STORE || "postgres",
      secret: process.env.SESSION_SECRET || "development-secret-change-in-production",
      redisUrl: process.env.REDIS_URL,
    },
    email: {
      provider: process.env.EMAIL_PROVIDER || "none",
      resendApiKey: process.env.RESEND_API_KEY,
      smtpHost: process.env.SMTP_HOST || (process.env.YANDEX_EMAIL ? "smtp.yandex.ru" : undefined),
      smtpPort: process.env.SMTP_PORT || (process.env.YANDEX_EMAIL ? 465 : undefined),
      smtpUser: process.env.SMTP_USER || process.env.YANDEX_EMAIL,
      smtpPassword: process.env.SMTP_PASSWORD || process.env.YANDEX_APP_PASSWORD,
      fromEmail: process.env.FROM_EMAIL || process.env.YANDEX_EMAIL,
    },
    translation: {
      deeplApiKey: process.env.DEEPL_API_KEY,
      enabled: !!process.env.DEEPL_API_KEY,
    },
    github: {
      enabled: !!process.env.REPLIT_CONNECTORS_HOSTNAME,
    },
    app: {
      nodeEnv: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
      port: process.env.PORT || 5000,
      baseUrl: process.env.BASE_URL,
    },
  });

  return config;
}

export function validateDatabaseConfig(config: AppConfig): void {
  if (!config.database.url) {
    const { host, port, user, password, name } = config.database;
    if (!host || !user || !name) {
      console.warn(
        "Database configuration incomplete. Set DATABASE_URL or individual PGHOST, PGUSER, PGPASSWORD, PGDATABASE variables."
      );
    }
  }
}

export function buildDatabaseUrl(config: AppConfig): string | undefined {
  if (config.database.url) {
    return config.database.url;
  }
  const { host, port, user, password, name } = config.database;
  if (host && user && name) {
    const portPart = port ? `:${port}` : "";
    const authPart = password ? `${user}:${password}` : user;
    return `postgresql://${authPart}@${host}${portPart}/${name}`;
  }
  return undefined;
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}
