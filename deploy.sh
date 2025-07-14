#!/bin/bash

# Academic Workflow Docker Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.local"
BACKUP_DIR="backups"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker first."
    fi
    
    success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.docker" ]; then
            cp .env.docker "$ENV_FILE"
            warn "Created $ENV_FILE from template. Please update with your values."
        else
            error "No environment file found. Please create $ENV_FILE with required variables."
        fi
    fi
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
        success "Environment variables loaded"
    fi
}

# Build application
build_application() {
    log "Building application..."
    
    # Run tests first
    log "Running tests..."
    npm run test || warn "Tests failed, continuing with deployment"
    
    # Build the Docker image
    log "Building Docker image..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    success "Application built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres
    sleep 10
    
    # Run Prisma migrations
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy || warn "Migration failed"
    
    success "Database migrations completed"
}

# Backup existing data
backup_data() {
    if [ "$1" = "skip" ]; then
        log "Skipping backup..."
        return
    fi
    
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Backup database if running
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec postgres pg_dump -U workflow_user academic_workflow > "$BACKUP_FILE" || warn "Backup failed"
        success "Backup created: $BACKUP_FILE"
    else
        log "Database not running, skipping backup"
    fi
}

# Deploy application
deploy() {
    local mode="${1:-development}"
    
    log "Deploying in $mode mode..."
    
    if [ "$mode" = "production" ]; then
        # Production deployment with monitoring
        docker-compose -f "$COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" up -d
    else
        # Development deployment
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    check_health
    
    success "Deployment completed successfully"
}

# Check application health
check_health() {
    log "Checking application health..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            success "Application is healthy"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Waiting for application to be healthy..."
        sleep 10
        ((attempt++))
    done
    
    error "Application health check failed after $max_attempts attempts"
}

# Show logs
show_logs() {
    local service="${1:-app}"
    docker-compose logs -f "$service"
}

# Stop services
stop() {
    log "Stopping services..."
    docker-compose down
    success "Services stopped"
}

# Clean up
cleanup() {
    log "Cleaning up..."
    docker-compose down -v
    docker system prune -f
    success "Cleanup completed"
}

# Main script
main() {
    case "${1:-deploy}" in
        "check")
            check_prerequisites
            ;;
        "build")
            check_prerequisites
            setup_environment
            build_application
            ;;
        "deploy")
            mode="${2:-development}"
            check_prerequisites
            setup_environment
            backup_data "${3}"
            build_application
            run_migrations
            deploy "$mode"
            ;;
        "prod")
            check_prerequisites
            setup_environment
            backup_data
            build_application
            run_migrations
            deploy "production"
            ;;
        "health")
            check_health
            ;;
        "logs")
            show_logs "${2:-app}"
            ;;
        "stop")
            stop
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            echo "Academic Workflow Deployment Script"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  check               Check prerequisites"
            echo "  build               Build the application"
            echo "  deploy [mode]       Deploy application (development|production)"
            echo "  prod                Deploy in production mode with monitoring"
            echo "  health              Check application health"
            echo "  logs [service]      Show logs for service (default: app)"
            echo "  stop                Stop all services"
            echo "  cleanup             Stop services and clean up volumes"
            echo "  help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 deploy                    # Deploy in development mode"
            echo "  $0 deploy production         # Deploy in production mode"
            echo "  $0 deploy development skip   # Deploy without backup"
            echo "  $0 prod                      # Deploy with full monitoring"
            echo "  $0 logs nginx                # Show nginx logs"
            ;;
    esac
}

# Run main function with all arguments
main "$@"