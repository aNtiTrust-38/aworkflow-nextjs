# Docker Deployment Guide

This guide covers deploying the Academic Workflow Assistant using Docker and Docker Compose for both development and production environments.

## Quick Start

### Prerequisites

- Docker 20.10+ 
- Docker Compose 2.0+
- 4GB+ available RAM
- 10GB+ available disk space

### Development Deployment

1. **Setup environment:**
   ```bash
   cp .env.docker .env.local
   # Edit .env.local with your API keys and configuration
   ```

2. **Deploy with one command:**
   ```bash
   ./deploy.sh deploy
   ```

3. **Access the application:**
   - Application: http://localhost:3000
   - Health check: http://localhost:3000/api/health

### Production Deployment

1. **Deploy with monitoring:**
   ```bash
   ./deploy.sh prod
   ```

2. **Access services:**
   - Application: http://localhost:3000
   - Grafana: http://localhost:3001 (admin/admin)
   - Prometheus: http://localhost:9090

## Architecture

### Services Overview

| Service | Description | Port | Health Check |
|---------|-------------|------|--------------|
| **app** | Next.js application | 3000 | /api/health |
| **postgres** | PostgreSQL database | 5432 | pg_isready |
| **redis** | Redis cache/sessions | 6379 | ping |
| **nginx** | Reverse proxy (prod) | 80/443 | - |
| **prometheus** | Metrics collection (prod) | 9090 | - |
| **grafana** | Monitoring dashboard (prod) | 3001 | - |

### Docker Images

- **app**: Multi-stage build with Node.js 18 Alpine
- **postgres**: PostgreSQL 15 Alpine with performance tuning
- **redis**: Redis 7 Alpine with persistence
- **nginx**: Nginx Alpine with security headers
- **prometheus**: Official Prometheus image
- **grafana**: Official Grafana image

## Configuration

### Environment Variables

Copy `.env.docker` to `.env.local` and configure:

#### Required Variables
```bash
# AI Provider API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Security
SETTINGS_ENCRYPTION_KEY=your_32_character_encryption_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
JWT_SECRET=your_jwt_secret_key_here

# Database
POSTGRES_PASSWORD=secure_password_change_me
```

#### Optional Variables
```bash
# Redis
REDIS_PASSWORD=redis_password_change_me

# Logging
LOG_LEVEL=info

# Monitoring
ENABLE_TELEMETRY=true
```

### Database Configuration

The application automatically handles:
- Database creation and migrations
- User table initialization
- Index creation for performance

## Deployment Commands

### Using Deploy Script

The `deploy.sh` script provides convenient commands:

```bash
# Check prerequisites
./deploy.sh check

# Build application
./deploy.sh build

# Deploy (development)
./deploy.sh deploy

# Deploy (production with monitoring)
./deploy.sh prod

# Check health
./deploy.sh health

# View logs
./deploy.sh logs [service]

# Stop services
./deploy.sh stop

# Cleanup (removes volumes)
./deploy.sh cleanup
```

### Manual Docker Compose

#### Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

#### Production
```bash
# Start with monitoring
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale application
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3

# Rolling update
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate app
```

## Data Persistence

### Volumes

| Volume | Purpose | Backup Required |
|--------|---------|-----------------|
| `postgres_data` | Database storage | Yes |
| `redis_data` | Cache/session data | Optional |
| `app_data` | Application files | Yes |
| `app_logs` | Application logs | No |
| `grafana_data` | Grafana dashboards | Optional |
| `prometheus_data` | Metrics data | Optional |

### Backup and Restore

#### Automated Backups
```bash
# Enable in .env.local
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
```

#### Manual Backup
```bash
# Database backup
docker-compose exec postgres pg_dump -U workflow_user academic_workflow > backup.sql

# Application data backup
docker run --rm -v aworkflow-nextjs_app_data:/data -v $(pwd):/backup alpine tar czf /backup/app_data.tar.gz -C /data .
```

#### Restore
```bash
# Database restore
docker-compose exec -T postgres psql -U workflow_user academic_workflow < backup.sql

# Application data restore
docker run --rm -v aworkflow-nextjs_app_data:/data -v $(pwd):/backup alpine tar xzf /backup/app_data.tar.gz -C /data
```

## Monitoring and Logging

### Application Health

The health endpoint (`/api/health`) monitors:
- Database connectivity
- Memory usage
- API provider configuration
- Service dependencies

### Prometheus Metrics

Available at `/api/metrics`:
- HTTP request metrics
- Database query performance
- Memory and CPU usage
- Custom application metrics

### Grafana Dashboards

Pre-configured dashboards for:
- Application performance
- Database metrics
- Infrastructure monitoring
- User activity

### Log Management

Logs are available via:
```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# All services
docker-compose logs -f
```

## Security

### Container Security

- Non-root user execution
- Read-only root filesystem where possible
- Resource limits and constraints
- Security headers via Nginx

### Network Security

- Isolated Docker network
- Internal service communication
- Rate limiting on API endpoints
- SSL/TLS support (configure certificates)

### Data Security

- Encrypted environment variables
- Database password protection
- API key management
- Secure session handling

## Performance Optimization

### Resource Allocation

#### Development
- App: 256MB RAM, 0.25 CPU
- PostgreSQL: 512MB RAM, 0.5 CPU
- Redis: 128MB RAM, 0.1 CPU

#### Production
- App: 512MB RAM, 0.5 CPU (2+ replicas)
- PostgreSQL: 1GB RAM, 1.0 CPU
- Redis: 256MB RAM, 0.25 CPU

### Database Tuning

Production PostgreSQL configuration:
- `shared_buffers=256MB`
- `effective_cache_size=1GB`
- `max_connections=100`
- Connection pooling enabled

### Caching Strategy

- Redis for session storage
- Nginx for static file caching
- Application-level response caching
- Database query result caching

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
sudo lsof -i :3000
sudo lsof -i :5432

# Use different ports
export PORT=3001
```

#### Memory Issues
```bash
# Check Docker resources
docker system df
docker stats

# Clean up
docker system prune -a
```

#### Database Connection
```bash
# Check database health
docker-compose exec postgres pg_isready -U workflow_user

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Debug Mode

Enable debug logging:
```bash
# In .env.local
LOG_LEVEL=debug

# Restart services
docker-compose restart app
```

### Service Health Checks

```bash
# Check all services
docker-compose ps

# Individual service health
curl http://localhost:3000/api/health
```

## Scaling and Load Balancing

### Horizontal Scaling

```bash
# Scale application instances
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3

# Load balancing handled by Nginx upstream
```

### Database Scaling

For high-load scenarios:
1. Enable PostgreSQL connection pooling
2. Configure read replicas
3. Implement database sharding
4. Use external managed database service

### Monitoring Scaling

As your application grows:
1. Add more Prometheus targets
2. Create custom Grafana dashboards
3. Implement alerting rules
4. Set up log aggregation

## Production Checklist

Before deploying to production:

- [ ] Update all default passwords
- [ ] Configure SSL certificates
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Review security headers
- [ ] Test disaster recovery
- [ ] Document runbook procedures
- [ ] Set up log aggregation
- [ ] Configure rate limiting
- [ ] Review resource limits

## Support

For issues and questions:
1. Check the application logs
2. Review this documentation
3. Check the project's GitHub issues
4. Contact the development team

## Contributing

When contributing Docker-related changes:
1. Test with both development and production configurations
2. Update this documentation
3. Verify security implications
4. Test backup and restore procedures
5. Update the deployment script if needed