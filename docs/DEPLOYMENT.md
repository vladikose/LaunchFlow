# LaunchFlow Deployment Guide

This guide describes how to deploy LaunchFlow outside of Replit.

## Environment Variables

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PROVIDER` | No | `neon` | Database provider: `neon` or `postgres` |
| `DATABASE_URL` | Yes* | - | Full PostgreSQL connection string |
| `PGHOST` | No* | - | PostgreSQL host (alternative to DATABASE_URL) |
| `PGPORT` | No | `5432` | PostgreSQL port |
| `PGUSER` | No* | - | PostgreSQL username |
| `PGPASSWORD` | No* | - | PostgreSQL password |
| `PGDATABASE` | No* | - | PostgreSQL database name |

*Either `DATABASE_URL` or individual `PG*` variables required.

### Storage Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_PROVIDER` | No | `gcs-replit` | Storage: `gcs-replit`, `s3`, `local` |
| `PUBLIC_OBJECT_SEARCH_PATHS` | For GCS | - | GCS public paths (comma-separated) |
| `PRIVATE_OBJECT_DIR` | For GCS | - | GCS private directory |
| `S3_ENDPOINT` | For S3 | - | S3-compatible endpoint URL |
| `S3_REGION` | For S3 | - | S3 region |
| `S3_ACCESS_KEY` | For S3 | - | S3 access key |
| `S3_SECRET_KEY` | For S3 | - | S3 secret key |
| `S3_BUCKET` | For S3 | - | S3 bucket name |
| `LOCAL_STORAGE_PATH` | For local | `./uploads` | Local storage directory |

### Session Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_STORE` | No | `postgres` | Session store: `postgres`, `redis`, `memory` |
| `SESSION_SECRET` | Yes | - | Secret key for session encryption |
| `REDIS_URL` | For Redis | - | Redis connection URL |

### Email Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | `none` | Email provider: `resend`, `smtp`, `none` |
| `RESEND_API_KEY` | For Resend | - | Resend API key |
| `SMTP_HOST` | For SMTP | - | SMTP server host |
| `SMTP_PORT` | For SMTP | `587` | SMTP server port |
| `SMTP_USER` | For SMTP | - | SMTP username |
| `SMTP_PASSWORD` | For SMTP | - | SMTP password |
| `FROM_EMAIL` | No | - | Sender email address |

### Translation Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPL_API_KEY` | No | - | DeepL API key for translations |

### Application Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `production` |
| `PORT` | No | `5000` | Application port |
| `BASE_URL` | No | - | Public URL of the application |

## Deployment Options

### Docker Compose (Recommended)

1. Clone the repository
2. Create `.env` file with required variables
3. Run:

```bash
docker-compose up -d
```

### Manual Deployment

1. Install Node.js 20+
2. Install PostgreSQL 16+
3. Clone repository
4. Install dependencies:

```bash
npm ci
```

5. Set environment variables
6. Build application:

```bash
npm run build
```

7. Run database migrations:

```bash
npm run db:push
```

8. Start application:

```bash
npm start
```

## Data Migration

### Export from Replit

```bash
npx tsx scripts/export-data.ts
```

This creates `data-export/` directory with JSON files.

### Import to New Environment

1. Copy `data-export/` to new environment
2. Run:

```bash
npx tsx scripts/import-data.ts
```

### File Migration

For GCS files, you'll need to manually download and re-upload to your new storage provider.

## Health Checks

The application exposes:
- `GET /api/health` - Basic health check
- Database connection is verified on startup

## Scaling

For production deployments, consider:
- Use Redis for session storage with `SESSION_STORE=redis`
- Use S3-compatible storage for files
- Deploy behind a load balancer
- Set up database connection pooling
