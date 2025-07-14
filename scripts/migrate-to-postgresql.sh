#!/bin/bash

# Academic Workflow PostgreSQL Migration Script
# This script migrates data from SQLite to PostgreSQL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SQLITE_DB="${DATABASE_URL:-file:./prisma/dev.db}"
POSTGRES_URL="${POSTGRES_DATABASE_URL:-postgresql://workflow_user:secure_password_change_me@localhost:5432/academic_workflow}"
BACKUP_DIR="migration_backup_$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="temp_migration"

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
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check Prisma CLI
    if ! npx prisma --version &> /dev/null; then
        error "Prisma CLI is not available"
    fi
    
    # Check if SQLite database exists
    SQLITE_FILE=$(echo "$SQLITE_DB" | sed 's/file://')
    if [ ! -f "$SQLITE_FILE" ]; then
        warn "SQLite database not found at $SQLITE_FILE"
        read -p "Continue with fresh PostgreSQL setup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check PostgreSQL connection
    log "Testing PostgreSQL connection..."
    if ! npx prisma db execute --url="$POSTGRES_URL" --stdin <<< "SELECT 1;" &> /dev/null; then
        error "Cannot connect to PostgreSQL database at $POSTGRES_URL"
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup SQLite database
    if [ -f "$SQLITE_FILE" ]; then
        cp "$SQLITE_FILE" "$BACKUP_DIR/sqlite_backup.db"
        success "SQLite database backed up"
    fi
    
    # Backup current environment
    cp .env.local "$BACKUP_DIR/.env.local.backup" 2>/dev/null || true
    cp prisma/schema.prisma "$BACKUP_DIR/schema.prisma.backup"
    
    # Export SQLite data to JSON
    if [ -f "$SQLITE_FILE" ]; then
        log "Exporting SQLite data..."
        npx prisma db seed --preview-feature || true
        
        # Create data export script
        cat > "$TEMP_DIR/export_data.js" << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
  try {
    const users = await prisma.user.findMany({
      include: {
        settings: true,
        papers: {
          include: {
            references: true,
            files: true
          }
        },
        files: true
      }
    });
    
    const appSettings = await prisma.appSetting.findMany();
    
    const exportData = {
      users,
      appSettings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    fs.writeFileSync('exported_data.json', JSON.stringify(exportData, null, 2));
    console.log('Data exported successfully');
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
EOF
        
        mkdir -p "$TEMP_DIR"
        cd "$TEMP_DIR"
        node export_data.js
        mv exported_data.json "../$BACKUP_DIR/"
        cd ..
        rm -rf "$TEMP_DIR"
        
        success "Data exported to $BACKUP_DIR/exported_data.json"
    fi
}

# Setup PostgreSQL schema
setup_postgresql() {
    log "Setting up PostgreSQL schema..."
    
    # Backup current schema
    cp prisma/schema.prisma prisma/schema.sqlite.prisma
    
    # Use PostgreSQL schema
    cp prisma/schema.postgresql.prisma prisma/schema.prisma
    
    # Update environment
    log "Updating environment configuration..."
    
    # Update .env.local
    if [ -f ".env.local" ]; then
        sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$POSTGRES_URL\"|" .env.local
    else
        echo "DATABASE_URL=\"$POSTGRES_URL\"" > .env.local
    fi
    
    # Generate Prisma client
    log "Generating Prisma client..."
    npx prisma generate
    
    # Reset and migrate database
    log "Resetting PostgreSQL database..."
    npx prisma db push --force-reset --accept-data-loss
    
    success "PostgreSQL schema setup completed"
}

# Import data
import_data() {
    if [ ! -f "$BACKUP_DIR/exported_data.json" ]; then
        warn "No exported data found, skipping import"
        return
    fi
    
    log "Importing data to PostgreSQL..."
    
    # Create import script
    cat > "$TEMP_DIR/import_data.js" << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importData() {
  try {
    const data = JSON.parse(fs.readFileSync('../migration_backup_*/exported_data.json', 'utf8'));
    
    console.log(`Importing ${data.users.length} users...`);
    
    for (const user of data.users) {
      // Create user
      const createdUser = await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
      
      // Create user settings
      if (user.settings) {
        await prisma.userSettings.create({
          data: {
            id: user.settings.id,
            userId: createdUser.id,
            anthropicApiKey: user.settings.anthropicApiKey,
            openaiApiKey: user.settings.openaiApiKey,
            monthlyBudget: user.settings.monthlyBudget,
            preferredProvider: user.settings.preferredProvider,
            citationStyle: user.settings.citationStyle,
            defaultLanguage: user.settings.defaultLanguage,
            adhdFriendlyMode: user.settings.adhdFriendlyMode,
            theme: user.settings.theme,
            reducedMotion: user.settings.reducedMotion,
            highContrast: user.settings.highContrast,
            createdAt: user.settings.createdAt,
            updatedAt: user.settings.updatedAt
          }
        });
      }
      
      // Create papers
      for (const paper of user.papers) {
        const createdPaper = await prisma.paper.create({
          data: {
            id: paper.id,
            userId: createdUser.id,
            title: paper.title,
            outline: paper.outline,
            content: paper.content,
            status: paper.status,
            createdAt: paper.createdAt,
            updatedAt: paper.updatedAt
          }
        });
        
        // Create references
        for (const reference of paper.references) {
          await prisma.reference.create({
            data: {
              id: reference.id,
              paperId: createdPaper.id,
              title: reference.title,
              authors: reference.authors,
              source: reference.source,
              url: reference.url,
              citation: reference.citation,
              addedAt: reference.addedAt
            }
          });
        }
        
        // Create files
        for (const file of paper.files) {
          await prisma.file.create({
            data: {
              id: file.id,
              paperId: createdPaper.id,
              userId: createdUser.id,
              filename: file.filename,
              type: file.type,
              path: file.path,
              uploadedAt: file.uploadedAt
            }
          });
        }
      }
      
      // Create user files (not associated with papers)
      for (const file of user.files.filter(f => !f.paperId)) {
        await prisma.file.create({
          data: {
            id: file.id,
            userId: createdUser.id,
            filename: file.filename,
            type: file.type,
            path: file.path,
            uploadedAt: file.uploadedAt
          }
        });
      }
    }
    
    // Import app settings
    console.log(`Importing ${data.appSettings.length} app settings...`);
    for (const setting of data.appSettings) {
      await prisma.appSetting.create({
        data: {
          id: setting.id,
          key: setting.key,
          value: setting.value,
          encrypted: setting.encrypted,
          category: setting.category,
          description: setting.description,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        }
      });
    }
    
    console.log('Data imported successfully');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
EOF
    
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    node import_data.js
    cd ..
    rm -rf "$TEMP_DIR"
    
    success "Data imported successfully"
}

# Verify migration
verify_migration() {
    log "Verifying migration..."
    
    # Count records
    log "Checking record counts..."
    
    # Create verification script
    cat > "$TEMP_DIR/verify.js" << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  try {
    const userCount = await prisma.user.count();
    const paperCount = await prisma.paper.count();
    const referenceCount = await prisma.reference.count();
    const fileCount = await prisma.file.count();
    const settingCount = await prisma.appSetting.count();
    
    console.log('PostgreSQL Record Counts:');
    console.log(`Users: ${userCount}`);
    console.log(`Papers: ${paperCount}`);
    console.log(`References: ${referenceCount}`);
    console.log(`Files: ${fileCount}`);
    console.log(`Settings: ${settingCount}`);
    
    // Test basic operations
    console.log('\nTesting basic operations...');
    
    // Test user creation
    const testUser = await prisma.user.create({
      data: {
        name: 'Migration Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'test-password'
      }
    });
    
    // Test user retrieval
    const retrievedUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    if (retrievedUser) {
      console.log('✅ User operations working');
    }
    
    // Cleanup test user
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    
    console.log('✅ Migration verification completed successfully');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
EOF
    
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    node verify.js
    cd ..
    rm -rf "$TEMP_DIR"
    
    success "Migration verification completed"
}

# Cleanup
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    success "Cleanup completed"
}

# Main migration function
main() {
    case "${1:-migrate}" in
        "check")
            check_prerequisites
            ;;
        "backup")
            check_prerequisites
            create_backup
            ;;
        "setup")
            check_prerequisites
            setup_postgresql
            ;;
        "import")
            check_prerequisites
            import_data
            ;;
        "verify")
            check_prerequisites
            verify_migration
            ;;
        "migrate")
            log "Starting full migration to PostgreSQL..."
            check_prerequisites
            create_backup
            setup_postgresql
            import_data
            verify_migration
            cleanup
            success "Migration completed successfully!"
            
            echo ""
            echo "Next steps:"
            echo "1. Test your application with PostgreSQL"
            echo "2. Update your production environment variables"
            echo "3. Deploy with the new database configuration"
            echo ""
            echo "Backup location: $BACKUP_DIR"
            ;;
        "rollback")
            log "Rolling back to SQLite..."
            if [ -f "$BACKUP_DIR/schema.prisma.backup" ]; then
                cp "$BACKUP_DIR/schema.prisma.backup" prisma/schema.prisma
                if [ -f "$BACKUP_DIR/.env.local.backup" ]; then
                    cp "$BACKUP_DIR/.env.local.backup" .env.local
                fi
                npx prisma generate
                success "Rollback completed"
            else
                error "No backup found for rollback"
            fi
            ;;
        "help"|*)
            echo "Academic Workflow PostgreSQL Migration Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  check     Check prerequisites"
            echo "  backup    Create backup only"
            echo "  setup     Setup PostgreSQL schema only"
            echo "  import    Import data only"
            echo "  verify    Verify migration only"
            echo "  migrate   Full migration (default)"
            echo "  rollback  Rollback to SQLite"
            echo "  help      Show this help"
            echo ""
            echo "Environment Variables:"
            echo "  DATABASE_URL          SQLite database URL"
            echo "  POSTGRES_DATABASE_URL PostgreSQL database URL"
            echo ""
            echo "Examples:"
            echo "  $0 migrate                                    # Full migration"
            echo "  POSTGRES_DATABASE_URL=... $0 migrate          # Custom PostgreSQL URL"
            echo "  $0 check                                      # Check prerequisites only"
            ;;
    esac
}

# Run main function with all arguments
main "$@"