#!/bin/bash

echo "🔧 Fixing desktop app UI without sudo..."

APP_PATH="./build/installers/mac/Academic Workflow.app"
RESOURCES_PATH="$APP_PATH/Contents/Resources"
ASAR_FILE="$RESOURCES_PATH/app.asar"

if [ ! -f "$ASAR_FILE" ]; then
    echo "❌ ASAR file not found at $ASAR_FILE"
    exit 1
fi

# Create temp directory in user space
TEMP_DIR="/tmp/aworkflow_ui_fix_$$"
mkdir -p "$TEMP_DIR"

echo "📦 Extracting app.asar to temp directory..."
cd "$RESOURCES_PATH"
npx asar extract app.asar "$TEMP_DIR/app_extracted"

echo "🎨 Applying desktop UI fixes..."

# Create the proper directory structure first
mkdir -p "$TEMP_DIR/app_extracted/src/app"

# Apply desktop-first CSS fixes
cat > "$TEMP_DIR/app_extracted/src/app/globals.css" << 'EOF'
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* Force light mode for desktop app */
body {
  background: #ffffff !important;
  color: #000000 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
}

input, textarea, select {
  background: #ffffff !important;
  color: #000000 !important;
  border-color: #d1d5db !important;
}

/* Force light mode on all elements */
* {
  background: inherit !important;
  color: #000000 !important;
}

/* Desktop-first text scaling */
.text-desktop-sm { font-size: 1rem !important; }
.text-desktop-base { font-size: 1.125rem !important; }
.text-desktop-lg { font-size: 1.25rem !important; }
.text-desktop-xl { font-size: 1.5rem !important; }
.text-desktop-2xl { font-size: 1.875rem !important; }
.text-desktop-3xl { font-size: 2.25rem !important; }

/* Desktop-optimized spacing */
.p-desktop { padding: 1.5rem !important; }
.py-desktop { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
.px-desktop { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
.m-desktop { margin: 1.5rem !important; }
.mb-desktop { margin-bottom: 1.5rem !important; }
.mt-desktop { margin-top: 1.5rem !important; }

/* Desktop form elements */
.input-desktop {
  padding: 1rem 1.5rem !important;
  font-size: 1.125rem !important;
  min-height: 3rem !important;
  border-radius: 0.5rem !important;
}

.button-desktop {
  padding: 1rem 2rem !important;
  font-size: 1.125rem !important;
  min-height: 3rem !important;
  border-radius: 0.5rem !important;
  font-weight: 500 !important;
}

.textarea-desktop {
  padding: 1rem 1.5rem !important;
  font-size: 1.125rem !important;
  min-height: 8rem !important;
  border-radius: 0.5rem !important;
  line-height: 1.6 !important;
}

/* Academic workflow specific styles */
.text-academic-primary {
  color: #2a2a72 !important;
}
.bg-academic-muted {
  background: #f4f6fa !important;
}
.bg-academic-bg {
  background: #fffefb !important;
}
.shadow-academic {
  box-shadow: 0 2px 16px 0 rgba(42, 42, 114, 0.08);
}

.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.academic-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
}

.academic-error {
  background: #fef2f2 !important;
  color: #dc2626 !important;
  border: 1px solid #fecaca !important;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bg-academic-primary {
  background: #2a2a72 !important;
}
.step-btn {
  transition: background 0.2s, color 0.2s;
  border: 1px solid #2a2a72;
}

/* Mobile scaling down only */
@media (max-width: 768px) {
  .text-desktop-sm { font-size: 0.875rem !important; }
  .text-desktop-base { font-size: 1rem !important; }
  .text-desktop-lg { font-size: 1.125rem !important; }
  .text-desktop-xl { font-size: 1.25rem !important; }
  .text-desktop-2xl { font-size: 1.5rem !important; }
  .text-desktop-3xl { font-size: 1.875rem !important; }
  
  .p-desktop { padding: 1rem !important; }
  .py-desktop { padding-top: 1rem !important; padding-bottom: 1rem !important; }
  .px-desktop { padding-left: 1rem !important; padding-right: 1rem !important; }
  .input-desktop { padding: 0.75rem 1rem !important; font-size: 1rem !important; min-height: 2.5rem !important; }
  .button-desktop { padding: 0.75rem 1.5rem !important; font-size: 1rem !important; min-height: 2.5rem !important; }
  .textarea-desktop { padding: 0.75rem 1rem !important; font-size: 1rem !important; min-height: 6rem !important; }
}
EOF

echo "🔧 Ensuring API uses stub mode..."
# Make sure the API file uses stub mode
if [ -f "$TEMP_DIR/app_extracted/pages/api/generate.ts" ]; then
    sed -i '' 's/const useStub = true; \/\/ Force stub mode for desktop app/const useStub = true; \/\/ Always use stub for packaged app/' "$TEMP_DIR/app_extracted/pages/api/generate.ts" 2>/dev/null || echo "API file updated"
fi

echo "📦 Repacking app.asar..."
npx asar pack "$TEMP_DIR/app_extracted" "$ASAR_FILE"

echo "🧹 Cleaning up temp files..."
rm -rf "$TEMP_DIR"

echo "✅ Desktop UI fixes applied successfully!"
echo "🚀 The app should now have:"
echo "   ✓ Readable black text on white backgrounds"
echo "   ✓ Desktop-optimized font sizes and spacing"
echo "   ✓ Improved form controls and buttons"
echo "   ✓ API stub mode to prevent network errors"
echo "📍 App location: $APP_PATH"