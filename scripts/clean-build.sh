#!/bin/bash

# Clean up build directories and temporary files

echo "🧹 Cleaning build directories..."

# Remove temporary build files
rm -rf build/temp 2>/dev/null || true
rm -f build/build-report.json 2>/dev/null || true

# Remove temporary icon files
find build/assets/ -name "icon-*.svg" -delete 2>/dev/null || true
rm -f build/assets/dmg-background.svg 2>/dev/null || true

# Remove old build directories (skip if protected)
echo "⚠️  Attempting to remove old build/installers (may require manual cleanup)..."
rm -rf build/installers 2>/dev/null || echo "   → build/installers has protected files, skipping"

# Clean up node modules caches
echo "🗑️  Cleaning npm cache..."
npm cache clean --force >/dev/null 2>&1 || true

# Clean up Next.js cache
echo "🗑️  Cleaning Next.js cache..."
rm -rf .next 2>/dev/null || true

echo "✅ Build cleanup completed!"
echo ""
echo "📦 Final installers are in: dist/installers/"
echo "   - Academic Workflow.app (macOS application)"
echo "   - Academic-Workflow-1.0.0-x64.dmg (DMG installer)"
echo ""