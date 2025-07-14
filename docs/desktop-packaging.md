# Desktop Packaging Guide

## Overview

The Academic Workflow Assistant now supports desktop packaging as a native macOS application with a professional .dmg installer. This guide explains the desktop packaging system and how to create distribution packages.

## Architecture

### Electron + Next.js Server
- **Electron wrapper** provides native desktop experience
- **Next.js server** runs locally on dynamic port
- **SQLite database** stored in user data directory
- **Encrypted settings** persist across app launches

### Package Structure
```
AcademicWorkflow.app/
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure IPC bridge
│   └── package.json     # Electron configuration
├── .next/standalone/    # Next.js server bundle
├── public/             # Static assets
└── build/              # Desktop assets
    ├── icon.icns       # Application icon
    └── background.png  # DMG background
```

## Building for Desktop

### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Production Build
```bash
# Build Next.js app with standalone output
npm run build

# Create DMG installer
npm run electron:build

# Package without publishing
npm run electron:pack
```

## DMG Installer Features

### Installation Experience
- **Drag-to-Applications** interface matching macOS standards
- **Custom background** with Academic Workflow branding
- **Auto-cleanup** prompts user to move DMG to trash after installation
- **Professional appearance** with proper icon and layout

### DMG Configuration
```json
{
  "dmg": {
    "title": "Academic Workflow Assistant ${version}",
    "icon": "build/icon.icns",
    "background": "build/background.png",
    "window": { "width": 540, "height": 380 },
    "contents": [
      { "x": 130, "y": 220, "type": "file" },
      { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
    ]
  }
}
```

## Database Configuration

### Desktop Environment
- Database stored in `~/Library/Application Support/academic-workflow/`
- Automatic migration on first launch
- Encrypted settings in user data directory

### Configuration
```typescript
// lib/database/desktop-config.ts
export class DesktopDatabaseConfig {
  static getDatabasePath(): string {
    // Returns appropriate path for desktop environment
  }
  
  static async getPrismaClient(): Promise<PrismaClient> {
    // Returns configured Prisma client
  }
}
```

## Security Features

### Electron Security
- **Context isolation** enabled
- **Node integration** disabled in renderer
- **Secure IPC** communication via preload script
- **External link handling** opens in system browser

### Data Protection
- **Encrypted API keys** using AES-256-GCM
- **Secure database** in user data directory
- **No sensitive data** in logs or temporary files

## File Structure

### Key Files
- `electron/main.js` - Main Electron process
- `electron/preload.js` - Secure IPC bridge
- `electron/package.json` - Electron configuration
- `build/icon.icns` - Application icon
- `build/background.png` - DMG background
- `lib/database/desktop-config.ts` - Database configuration

### Build Scripts
- `electron:dev` - Development mode
- `electron:build` - Production build with DMG
- `electron:pack` - Package without publishing

## Testing

### Packaging Tests
```bash
# Run packaging tests
npm test -- __tests__/desktop-packaging.test.ts

# Test packaging configuration
node scripts/test-packaging.js
```

### Manual Testing
1. Run `npm run electron:dev` to test development mode
2. Run `npm run electron:build` to create DMG
3. Test DMG installation process
4. Verify app launches correctly
5. Test database creation and settings persistence

## Distribution

### Building for Release
```bash
# Create production build
npm run build

# Generate DMG installer
npm run electron:build
```

### Output Files
- `dist/Academic Workflow Assistant-0.1.0.dmg` - Installer
- `dist/Academic Workflow Assistant-0.1.0-mac.zip` - Archive
- `dist/mac/Academic Workflow Assistant.app` - Application bundle

## Auto-Cleanup

### macOS Built-in Feature
- macOS Sierra+ automatically prompts "Move to Trash?" after installation
- No additional configuration required
- Users can safely delete DMG after installation

### Installation Flow
1. User downloads `.dmg` file
2. Double-clicks to mount DMG
3. Sees custom background with drag-to-Applications interface
4. Drags app to Applications folder
5. macOS prompts to move DMG to trash
6. Clean installation complete

## Requirements

### Development
- Node.js 18+
- npm/yarn/pnpm
- macOS (for DMG creation)

### Runtime
- macOS 10.15+ (Catalina or later)
- 400MB disk space
- Internet connection for AI providers

## Troubleshooting

### Common Issues
1. **Build fails** - Check Next.js configuration and dependencies
2. **Electron won't start** - Verify port availability and database permissions
3. **DMG creation fails** - Check icon and background file formats
4. **Database errors** - Verify user data directory permissions

### Debug Mode
```bash
# Enable Electron debug mode
DEBUG=electron* npm run electron:dev

# Check database configuration
node -e "console.log(require('./lib/database/desktop-config').DesktopDatabaseConfig.getDatabasePath())"
```

## Next Steps

### Future Enhancements
- Code signing for distribution
- Auto-updater integration
- Windows and Linux support
- App Store submission
- Performance optimizations