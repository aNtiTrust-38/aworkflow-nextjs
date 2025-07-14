# PostgreSQL Migration Guide

This guide covers migrating the Academic Workflow Assistant from SQLite to PostgreSQL for production deployment.

## Overview

PostgreSQL provides better performance, scalability, and features for production use:

- **Performance**: Better query optimization and indexing
- **Scalability**: Support for larger datasets and concurrent users
- **Features**: Full-text search, JSON support, advanced data types
- **Reliability**: ACID compliance, WAL logging, point-in-time recovery
- **Monitoring**: Built-in statistics and performance monitoring

## Migration Process

### Prerequisites

1. **PostgreSQL Server**: Version 12 or higher
2. **Database Access**: Administrative privileges
3. **Backup Strategy**: Complete backup of SQLite data
4. **Downtime Window**: Plan for maintenance window

### Quick Migration

Use the automated migration script:

```bash
# Check prerequisites
./scripts/migrate-to-postgresql.sh check

# Run full migration
./scripts/migrate-to-postgresql.sh migrate

# With custom PostgreSQL URL
POSTGRES_DATABASE_URL="postgresql://user:password@host:5432/dbname" \
  ./scripts/migrate-to-postgresql.sh migrate
```

### Manual Migration Steps

#### 1. Backup Current Data

```bash
# Create backup directory
mkdir migration_backup_$(date +%Y%m%d)

# Backup SQLite database
cp prisma/dev.db migration_backup_*/

# Backup environment configuration
cp .env.local migration_backup_*/
```

#### 2. Setup PostgreSQL Database

```sql
-- Connect to PostgreSQL as admin
CREATE DATABASE academic_workflow;
CREATE USER workflow_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE academic_workflow TO workflow_user;

-- Enable required extensions
\c academic_workflow;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

#### 3. Update Application Configuration

```bash
# Update schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

# Update environment
echo 'DATABASE_URL="postgresql://workflow_user:password@localhost:5432/academic_workflow"' > .env.local

# Generate new Prisma client
npx prisma generate
```

#### 4. Run Migrations

```bash
# Deploy schema to PostgreSQL
npx prisma db push

# Verify schema
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

#### 5. Import Data

Use the migration script's import functionality or manually export/import:

```bash
# Export from SQLite (requires custom script)
./scripts/migrate-to-postgresql.sh backup

# Import to PostgreSQL
./scripts/migrate-to-postgresql.sh import
```

## Schema Differences

### SQLite → PostgreSQL Changes

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| UUID Generation | Text | `uuid-ossp` extension |
| Timestamps | TEXT/INTEGER | `TIMESTAMPTZ` |
| JSON Data | TEXT | `JSONB` |
| Full-text Search | Limited | Built-in `tsvector` |
| Constraints | Limited | Full support |
| Indexing | Basic | Advanced (GIN, GiST, etc.) |

### New PostgreSQL Features

1. **Enhanced Indexing**:
   ```sql
   -- Full-text search indexes
   CREATE INDEX papers_fulltext_idx ON "Paper" 
   USING GIN (to_tsvector('english', title || ' ' || content));
   
   -- Compound indexes for performance
   CREATE INDEX user_papers_idx ON "Paper" (user_id, created_at);
   ```

2. **Advanced Data Types**:
   ```sql
   -- JSONB for metadata
   ALTER TABLE "Paper" ADD COLUMN metadata JSONB;
   
   -- Arrays for tags
   ALTER TABLE "Paper" ADD COLUMN tags TEXT[];
   ```

3. **Full-text Search**:
   ```sql
   -- Search function
   SELECT * FROM papers_search('machine learning');
   ```

## Performance Optimization

### Connection Pooling

Configure connection pooling in your application:

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection string with pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"
```

### Database Configuration

Optimize PostgreSQL settings for the Academic Workflow:

```sql
-- Memory settings (adjust based on available RAM)
shared_buffers = 256MB                 # 25% of RAM
effective_cache_size = 1GB             # 75% of RAM
work_mem = 4MB                         # Per connection
maintenance_work_mem = 64MB            # For maintenance

-- Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

-- Query planner
random_page_cost = 1.1                 # For SSD storage
effective_io_concurrency = 200

-- Logging
log_min_duration_statement = 1000      # Log slow queries
```

### Indexing Strategy

Essential indexes for performance:

```sql
-- User-related indexes
CREATE INDEX CONCURRENTLY idx_users_email ON "User" (email);
CREATE INDEX CONCURRENTLY idx_users_created ON "User" (created_at);

-- Paper-related indexes
CREATE INDEX CONCURRENTLY idx_papers_user ON "Paper" (user_id);
CREATE INDEX CONCURRENTLY idx_papers_status ON "Paper" (status);
CREATE INDEX CONCURRENTLY idx_papers_updated ON "Paper" (updated_at);

-- Reference indexes
CREATE INDEX CONCURRENTLY idx_references_paper ON "Reference" (paper_id);
CREATE INDEX CONCURRENTLY idx_references_added ON "Reference" (added_at);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_papers_search ON "Paper" 
  USING GIN (to_tsvector('english', title || ' ' || coalesce(content, '')));
  
CREATE INDEX CONCURRENTLY idx_references_search ON "Reference"
  USING GIN (to_tsvector('english', title || ' ' || authors || ' ' || citation));
```

## Docker Integration

### Environment Configuration

Update your Docker environment:

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_URL=postgresql://workflow_user:${POSTGRES_PASSWORD}@postgres:5432/academic_workflow
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: academic_workflow
      POSTGRES_USER: workflow_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

### Production Docker Setup

```bash
# Using Docker with PostgreSQL
cp .env.docker .env.local

# Update with PostgreSQL settings
echo "DATABASE_URL=postgresql://workflow_user:secure_password@postgres:5432/academic_workflow" >> .env.local

# Deploy with PostgreSQL
./deploy.sh prod
```

## Monitoring and Maintenance

### Health Monitoring

Monitor database health:

```sql
-- Connection monitoring
SELECT count(*) as connections 
FROM pg_stat_activity 
WHERE datname = 'academic_workflow';

-- Database size
SELECT pg_size_pretty(pg_database_size('academic_workflow'));

-- Slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

### Regular Maintenance

```sql
-- Update statistics
ANALYZE;

-- Rebuild indexes if needed
REINDEX DATABASE academic_workflow;

-- Vacuum for space reclamation
VACUUM ANALYZE;
```

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_PATH="/backups/academic_workflow_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h localhost -U workflow_user academic_workflow > $BACKUP_PATH
gzip $BACKUP_PATH

# Retention policy (keep 30 days)
find /backups -name "academic_workflow_*.sql.gz" -mtime +30 -delete
```

## Troubleshooting

### Common Issues

#### Connection Problems

```bash
# Test connection
psql -h localhost -U workflow_user -d academic_workflow -c "SELECT 1;"

# Check PostgreSQL logs
docker logs postgres_container

# Verify network connectivity
telnet localhost 5432
```

#### Performance Issues

```sql
-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename IN ('User', 'Paper', 'Reference');

-- Identify slow queries
SELECT query, calls, total_time, mean_time, rows 
FROM pg_stat_statements 
WHERE calls > 100 
ORDER BY mean_time DESC;
```

#### Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Reset if needed (WARNING: Data loss)
npx prisma migrate reset

# Apply specific migration
npx prisma migrate deploy
```

### Rollback Procedure

If you need to rollback to SQLite:

```bash
# Restore SQLite schema
cp prisma/schema.sqlite.prisma prisma/schema.prisma

# Restore environment
cp migration_backup_*/env.local .env.local

# Restore database
cp migration_backup_*/dev.db prisma/dev.db

# Regenerate Prisma client
npx prisma generate
```

## Security Considerations

### Database Security

1. **Authentication**:
   ```sql
   -- Use strong passwords
   ALTER USER workflow_user PASSWORD 'very_secure_password_123!';
   
   -- Limit connections
   ALTER USER workflow_user CONNECTION LIMIT 20;
   ```

2. **Network Security**:
   ```bash
   # Enable SSL in connection string
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
   ```

3. **Access Control**:
   ```sql
   -- Principle of least privilege
   REVOKE ALL ON SCHEMA public FROM PUBLIC;
   GRANT USAGE ON SCHEMA public TO workflow_user;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO workflow_user;
   ```

### Application Security

- Validate all database inputs
- Use parameterized queries (Prisma handles this)
- Enable SQL injection protection
- Monitor for suspicious database activity

## Performance Benchmarks

### Expected Performance Improvements

| Operation | SQLite | PostgreSQL | Improvement |
|-----------|--------|------------|-------------|
| User lookup | 10ms | 2ms | 5x faster |
| Paper search | 100ms | 20ms | 5x faster |
| Bulk operations | 500ms | 100ms | 5x faster |
| Concurrent users | 1-2 | 50+ | 25x more |

### Load Testing

```bash
# Install k6 for load testing
npm install -g k6

# Run load test
k6 run --vus 10 --duration 30s load-test.js
```

## Migration Checklist

### Pre-Migration

- [ ] Backup all data
- [ ] Test PostgreSQL connection
- [ ] Review schema changes
- [ ] Plan maintenance window
- [ ] Notify users of downtime

### During Migration

- [ ] Stop application services
- [ ] Export SQLite data
- [ ] Setup PostgreSQL schema
- [ ] Import data to PostgreSQL
- [ ] Verify data integrity
- [ ] Update configuration
- [ ] Start services with PostgreSQL

### Post-Migration

- [ ] Verify application functionality
- [ ] Check performance metrics
- [ ] Monitor error logs
- [ ] Update documentation
- [ ] Clean up old SQLite files

## Support

For migration assistance:

1. **Documentation**: Review this guide and Prisma docs
2. **Testing**: Test migration in development first
3. **Backup**: Always maintain recent backups
4. **Monitoring**: Watch for performance issues
5. **Community**: PostgreSQL and Prisma communities

---

**Last Updated**: 2025-01-14
**PostgreSQL Version**: 15+
**Prisma Version**: 5.0+