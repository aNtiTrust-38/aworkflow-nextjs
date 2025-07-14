# Development Instructions - v1.7 Beta

## Current Development Status
- **Phase**: v1.7 Beta - User-Friendly File Management GUI
- **Status**: Planning completed, awaiting approval to begin development
- **Previous**: v1.0.0 production-ready with desktop packaging complete

## v1.7 Beta Development Plan

### Objective
Implement missing user-friendly GUI features for file management, folder configuration, and enhanced user experience.

### Critical Blockers Identified
1. **Test Infrastructure**: Navigation component tests failing (21/21) - IntersectionObserver polyfill needed
2. **TypeScript Issues**: 4 explicit `any` type violations in `lib/database/desktop-config.ts`
3. **SetupWizard Instability**: API response handling issues
4. **Missing Dependencies**: No drag-and-drop infrastructure

### Development Phases

#### Phase 1: Foundation Fixes (Critical)
**Goal**: Resolve blocking issues preventing stable development

1. **Fix Test Environment**
   - Add IntersectionObserver polyfill for Navigation tests
   - Resolve TypeScript compilation errors in `lib/database/desktop-config.ts`
   - Fix SetupWizard API response handling

2. **Stabilize Core Components**
   - Improve encryption service error handling
   - Ensure all existing functionality remains intact

#### Phase 2: Infrastructure Building
**Goal**: Add necessary dependencies and database support

1. **Add File Management Dependencies**
   - Install `react-dropzone@14.2.3` for drag-and-drop
   - Add `file-type@19.0.0` for file validation
   - Install supporting type definitions

2. **Extend Database Schema**
   - Add Folder model for hierarchical file organization
   - Extend File model with folder relationships
   - Create migration scripts

3. **Create API Endpoints**
   - Folder CRUD operations
   - File upload with folder assignment
   - Export folder configuration

#### Phase 3: GUI Implementation
**Goal**: Build user-friendly file management interfaces

1. **Drag-and-Drop File Upload Component**
   - Modern drop zone with progress indicators
   - File validation and error handling
   - Bulk upload support

2. **Folder Management Dashboard**
   - Directory tree visualization
   - Folder creation/deletion/rename
   - File organization tools

3. **Export Settings Enhancement**
   - Add export folder configuration to Settings Dashboard
   - Folder picker component
   - Persistent export location settings

4. **File Manager Interface**
   - File browser with preview
   - Bulk operations (move, delete, organize)
   - Search and filter capabilities

#### Phase 4: Integration & Testing
**Goal**: Ensure quality and performance standards

1. **Comprehensive Testing**
   - Unit tests for all new components
   - Integration tests for file operations
   - Accessibility testing for new features

2. **Performance Optimization**
   - Lazy loading for large file lists
   - Efficient file upload handling
   - Memory management for file operations

### Technical Specifications

#### New Components Required
- `components/FileUploadZone.tsx` - Drag-and-drop upload interface
- `components/FolderManager.tsx` - Directory management
- `components/FileBrowser.tsx` - File browsing interface
- `components/ExportSettings.tsx` - Export configuration panel

#### Database Extensions
```sql
-- Folder model for hierarchical organization
model Folder {
  id        String   @id @default(uuid())
  name      String
  path      String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  parentId  String?
  parent    Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children  Folder[] @relation("FolderHierarchy")
  files     File[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### API Endpoints
- `/api/folders` - CRUD operations
- `/api/files/upload` - Enhanced upload with folder support
- `/api/export/settings` - Export configuration

### Success Criteria for v1.7 Beta
1. **User-Friendly File Management**
   - Drag-and-drop file upload working
   - Folder creation and organization
   - Export folder configuration

2. **System Stability**
   - All existing tests passing
   - No regressions in current functionality
   - TypeScript compilation clean

3. **Performance**
   - File operations responsive
   - UI remains ADHD-friendly
   - Accessibility maintained

### Development Guidelines

#### TDD Methodology
1. Write tests for expected input/output pairs
2. Run tests to confirm they fail
3. Commit the failing tests
4. Write code that passes the tests
5. Use subagents to ensure implementation isn't overfitting
6. Commit the implementation when all tests pass

#### Quality Standards
- Maintain WCAG 2.1 AA accessibility compliance
- Preserve ADHD-friendly design principles
- Follow existing code conventions and patterns
- Ensure TypeScript strict mode compliance
- Maintain comprehensive test coverage

### Next Steps After Approval
1. Begin with Phase 1 critical fixes
2. Follow TDD methodology for all new features
3. Implement features incrementally with testing
4. Commit changes and create pull request when complete

## Previous Development History

### Desktop Packaging Implementation (v1.0.0 - COMPLETED ✅)
- [x] Research desktop packaging solutions
- [x] Implement Electron wrapper
- [x] Configure Next.js standalone output
- [x] Create DMG installer with professional appearance
- [x] Implement desktop database configuration
- [x] Add security features and encrypted settings
- [x] Create comprehensive test suite
- [x] Document desktop packaging system

### Available Commands
```bash
# Development
npm run dev                      # Start development server
npm run build                    # Build for production
npm run start                    # Start production server
npm run lint                     # Run ESLint
npm run test                     # Run all tests
npm run test:watch              # Run tests in watch mode
npm run test:ui                 # Run tests with UI interface

# Desktop Packaging
npm run electron:dev            # Test desktop app in development
npm run electron:build          # Create production DMG installer
npm run electron:pack           # Package without publishing

# Database Operations
npx prisma generate             # Generate Prisma client
npx prisma db push             # Push schema changes to database
npx prisma studio              # Open Prisma Studio database browser
```

## Ready for v1.7 Beta Development
The planning phase is complete. All requirements, blockers, and technical specifications have been identified. Implementation awaits approval to proceed with Phase 1 critical fixes.