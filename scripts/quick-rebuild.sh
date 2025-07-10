#!/bin/bash

echo "🚀 Quick rebuild for M4 Mac with fixes..."

# Kill any running processes
pkill -f "Academic Workflow" 2>/dev/null || true

# Update icon
echo "🎨 Updating app icon..."
cp aworkflow-icon.png build/assets/icon.png
cp aworkflow-icon.png build/assets/icon.icns

# Compile TypeScript directly to avoid hanging
echo "🔧 Compiling Electron TypeScript..."
npx tsc electron/main.ts --outDir dist/electron --target ES2020 --module commonjs --skipLibCheck --esModuleInterop --allowSyntheticDefaultImports &
COMPILE_PID=$!

# Wait for compilation with timeout
sleep 10
if ps -p $COMPILE_PID > /dev/null; then
    echo "⏰ Compilation taking too long, killing..."
    kill $COMPILE_PID 2>/dev/null || true
fi

# Quick rebuild for ARM64 only
echo "📦 Building ARM64 package..."
npx electron-builder --mac --arm64 --dir &
BUILD_PID=$!

# Wait for build with timeout
sleep 60
if ps -p $BUILD_PID > /dev/null; then
    echo "⏰ Build taking too long, killing..."
    kill $BUILD_PID 2>/dev/null || true
fi

echo "✅ Quick rebuild completed!"
echo "🎯 Test with: open \"dist/installers/mac-arm64/Academic Workflow.app\""