#!/bin/bash

echo "🔧 Patching database initialization in ARM64 app..."

APP_PATH="./dist/installers/mac-arm64/Academic Workflow.app"
RESOURCES_PATH="$APP_PATH/Contents/Resources"

# Create a simple database patch
echo "📁 Creating user data directory..."
USER_DATA_DIR="$HOME/Library/Application Support/Academic Workflow"
mkdir -p "$USER_DATA_DIR/database"

# Create a simple database file
echo "💾 Creating simple database file..."
touch "$USER_DATA_DIR/database/app.db"

# Create database environment file
echo "⚙️ Setting up database environment..."
cat > "$USER_DATA_DIR/.env" << EOF
DATABASE_URL=file:$USER_DATA_DIR/database/app.db
EOF

echo "✅ Database patch completed!"
echo "📍 Database location: $USER_DATA_DIR/database/app.db"
echo "🚀 Try running the app again"