-- PostgreSQL Initialization Script for Academic Workflow
-- This script sets up the database with optimal settings for production

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database if it doesn't exist (handled by Docker)
-- CREATE DATABASE academic_workflow;

-- Connect to the database
\c academic_workflow;

-- Create performance monitoring views
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE calls > 10
ORDER BY total_time DESC
LIMIT 20;

-- Create table space for large objects (optional)
-- CREATE TABLESPACE large_objects LOCATION '/var/lib/postgresql/data/large_objects';

-- Set optimal PostgreSQL configuration for Academic Workflow
-- These will be set via postgresql.conf in production

-- Memory settings (adjust based on available RAM)
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB

-- Checkpoint settings
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB

-- Query planner settings
-- random_page_cost = 1.1
-- effective_io_concurrency = 200

-- Logging settings
-- log_min_duration_statement = 1000
-- log_line_prefix = '%t [%p-%l] %q%u@%d '
-- log_checkpoints = on
-- log_connections = on
-- log_disconnections = on
-- log_lock_waits = on

-- Create indexes for better performance
-- These will be created by Prisma migrations, but we can prepare for them

-- Function to create UUID if not exists
CREATE OR REPLACE FUNCTION generate_uuid_if_null()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL THEN
        NEW.id = uuid_generate_v4();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function for full-text search
CREATE OR REPLACE FUNCTION papers_search(search_term TEXT)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    content TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        ts_rank(
            to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.content, '')),
            plainto_tsquery('english', search_term)
        ) as rank
    FROM "Paper" p
    WHERE to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.content, ''))
          @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function for reference search
CREATE OR REPLACE FUNCTION references_search(search_term TEXT)
RETURNS TABLE(
    id UUID,
    title VARCHAR(500),
    authors TEXT,
    citation TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.title,
        r.authors,
        r.citation,
        ts_rank(
            to_tsvector('english', COALESCE(r.title, '') || ' ' || COALESCE(r.authors, '') || ' ' || COALESCE(r.citation, '')),
            plainto_tsquery('english', search_term)
        ) as rank
    FROM "Reference" r
    WHERE to_tsvector('english', COALESCE(r.title, '') || ' ' || COALESCE(r.authors, '') || ' ' || COALESCE(r.citation, ''))
          @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Create backup function
CREATE OR REPLACE FUNCTION create_backup()
RETURNS TEXT AS $$
DECLARE
    backup_name TEXT;
    backup_path TEXT;
BEGIN
    backup_name := 'backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    backup_path := '/backups/' || backup_name || '.sql';
    
    -- Note: This would need to be executed with appropriate privileges
    -- EXECUTE format('COPY (SELECT * FROM pg_dump_all()) TO %L', backup_path);
    
    RETURN backup_name;
END;
$$ LANGUAGE plpgsql;

-- Create maintenance function for cleaning up old data
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up old audit logs (if audit table exists)
    -- DELETE FROM "AuditLog" WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    -- GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old sessions
    -- DELETE FROM "Session" WHERE expires_at < NOW();
    
    -- Clean up orphaned files (files without associated papers or users)
    -- This would be implemented based on your file cleanup policy
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
-- GRANT ALL PRIVILEGES ON DATABASE academic_workflow TO workflow_user;
GRANT USAGE ON SCHEMA public TO workflow_user;
GRANT CREATE ON SCHEMA public TO workflow_user;

-- Performance monitoring grants
GRANT SELECT ON pg_stat_statements TO workflow_user;
GRANT SELECT ON slow_queries TO workflow_user;

-- Insert initial configuration data
-- This would be handled by the application, but we can set some defaults

INSERT INTO "AppSetting" (id, key, value, encrypted, category, description)
VALUES 
    (uuid_generate_v4(), 'app.version', '1.0.0', false, 'system', 'Application version'),
    (uuid_generate_v4(), 'app.maintenance_mode', 'false', false, 'system', 'Maintenance mode flag'),
    (uuid_generate_v4(), 'security.session_timeout', '3600', false, 'security', 'Session timeout in seconds'),
    (uuid_generate_v4(), 'ai.default_provider', 'anthropic', false, 'ai', 'Default AI provider'),
    (uuid_generate_v4(), 'backup.enabled', 'true', false, 'backup', 'Enable automated backups'),
    (uuid_generate_v4(), 'backup.retention_days', '30', false, 'backup', 'Backup retention period')
ON CONFLICT (key) DO NOTHING;

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    COUNT(DISTINCT p.id) as paper_count,
    COUNT(DISTINCT r.id) as reference_count,
    COUNT(DISTINCT f.id) as file_count,
    MAX(p.updated_at) as last_paper_update
FROM "User" u
LEFT JOIN "Paper" p ON u.id = p."userId"
LEFT JOIN "Reference" r ON p.id = r."paperId"
LEFT JOIN "File" f ON u.id = f."userId"
GROUP BY u.id, u.name, u.email, u.created_at;

-- Create a view for system health
CREATE OR REPLACE VIEW system_health AS
SELECT 
    'database' as component,
    'healthy' as status,
    NOW() as checked_at,
    json_build_object(
        'total_users', (SELECT COUNT(*) FROM "User"),
        'total_papers', (SELECT COUNT(*) FROM "Paper"),
        'total_references', (SELECT COUNT(*) FROM "Reference"),
        'database_size', pg_size_pretty(pg_database_size(current_database())),
        'connections', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())
    ) as metadata;

-- Final message
SELECT 'PostgreSQL database initialized successfully for Academic Workflow' as status;