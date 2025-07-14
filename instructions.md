# Development Instructions - Critical Stability Resolution Plan

## Current Development Status
- **Phase**: Production Readiness Critical Fixes
- **Status**: **PLANNING - AWAITING APPROVAL TO PROCEED**
- **Issue**: Despite claims of 98% completion, critical stability issues prevent true production readiness
- **Assessment**: Realistic completion ~85-90%, with 5-7 weeks needed for stability

## Critical Stability Issues Analysis

Based on comprehensive analysis following CLAUDE.md guidelines, three major areas require resolution to achieve true production readiness:

### 1. Test Infrastructure Issues (Currently 70% Complete)
**Impact**: Test failures prevent reliable builds and continuous integration

### 2. Export Functionality Issues (Currently 60% Complete)  
**Impact**: Core academic feature broken, DOM rendering errors

### 3. API Endpoint Issues (Currently 75% Complete)
**Impact**: Database connection failures in critical endpoints

## DEVELOPMENT PLAN: PRODUCTION READINESS RESOLUTION

Following CLAUDE.md Inviolate Rules:
- **NO DEVELOPMENT until approval** - This is planning only
- **TDD Methodology Required** - Write tests first, implement to pass, commit when complete
- **Fix blockers systematically** - Address foundation issues before building new features

### PHASE 1: TEST INFRASTRUCTURE STABILIZATION (Priority: CRITICAL)
**Goal**: Achieve 95%+ test pass rate with stable CI/CD pipeline

#### Phase 1A: Database and Mocking Foundation (Days 1-3)
**Blockers to Resolve:**
1. **Prisma Client Mocking Crisis**
   - Fix `TypeError: Cannot read properties of undefined (reading 'findUnique')`
   - Create complete mock objects for User, Folder, File, UserSettings models
   - Ensure mock structure matches actual database schema
   - **Critical**: 18/23 API tests failing due to this issue

2. **TypeScript Compilation Errors (43+ errors)**
   - Fix `file-type` import: `fileTypeFromFile` → `fileTypeFromBlob`
   - Complete formidable mock interfaces in test files
   - Resolve `lib/database/desktop-config.ts` Promise/string type mismatch line 19
   - Add missing global type definitions for test environment

3. **Module Mock Configuration**
   - Fix `path` module mock to include default export
   - Use `importOriginal` helper for partial module mocks
   - Ensure all Node.js built-in module mocks are complete

#### Phase 1B: Component Test Environment (Days 4-5)
4. **CSS Style Testing Issues**
   - Resolve jsdom CSS computation limitations
   - Fix ProgressBar tests (13/23 failing with style assertions)
   - Consider data attributes instead of CSS style testing

5. **API Testing Infrastructure**
   - Fix formidable form parsing mocks
   - Ensure file upload simulation works correctly
   - Standardize API response mocking patterns

**Success Criteria Phase 1:**
- ✅ TypeScript compiles without errors
- ✅ 95%+ test pass rate
- ✅ Clean `npm run build` execution
- ✅ Stable vitest execution without timeouts

### PHASE 2: API ENDPOINT RELIABILITY (Priority: HIGH)
**Goal**: Achieve 100% API endpoint reliability with proper error handling

#### Phase 2A: Database Connection Management (Days 6-7)
**Root Cause**: Direct Prisma instantiation causing connection conflicts

1. **Centralize Database Management**
   - Update `/api/folders` to use shared Prisma instance from `lib/database-config.ts`
   - Update `/api/files/upload` to use DatabaseConnectionPool pattern
   - Follow successful pattern from `/api/health.ts` and `/api/user-settings.ts`

2. **Fix Database Connection Issues**
   - Replace direct `new PrismaClient()` calls
   - Use centralized connection pooling
   - Add proper cleanup and error handling

#### Phase 2B: File Upload API Stabilization (Days 8-9)
3. **File System Dependencies**
   - Fix path module mocking problems
   - Resolve temporary file cleanup errors
   - Add proper file validation and security checks

4. **Authentication Integration**
   - Ensure consistent session handling across endpoints
   - Add proper error responses for unauthorized access
   - Test authentication flow with real user scenarios

**Success Criteria Phase 2:**
- ✅ All API endpoints return proper responses (100% pass rate)
- ✅ No database connection errors in logs
- ✅ File upload functionality works end-to-end
- ✅ Proper error handling and user feedback

### PHASE 3: EXPORT FUNCTIONALITY COMPLETION (Priority: HIGH)
**Goal**: Complete export system with PDF/DOCX generation and Zotero sync

#### Phase 3A: Component Rendering Fixes (Days 10-12)
**Root Cause**: DOM rendering errors blocking export functionality

1. **Fix Component Mounting Issues**
   - Resolve `Failed to execute 'appendChild' on 'Node'` errors
   - Ensure WorkflowUI renders correctly with all sub-components
   - Fix React component lifecycle issues in export components

2. **Export Handler Implementation**
   - Connect existing PDFExporter class with handlePDFExport function
   - Implement proper academic formatting (margins, fonts, spacing)
   - Add citation formatting integration

#### Phase 3B: Export System Integration (Days 13-15)
3. **Complete PDF/DOCX Generation**
   - Connect Word exporter class with handleDOCXExport
   - Implement template-based generation system
   - Add server-side export API endpoints: `/api/export/pdf`, `/api/export/docx`

4. **Zotero Integration Completion**
   - Fix bidirectional sync authentication flow
   - Implement conflict resolution UI
   - Add progress tracking for bulk operations
   - Complete BibTeX export format implementation

**Success Criteria Phase 3:**
- ✅ PDF export generates properly formatted academic documents
- ✅ DOCX export creates professional Word documents
- ✅ Zotero sync works bidirectionally without errors
- ✅ Export settings integrate with main workflow UI
- ✅ Export preview functionality operational

### PHASE 4: PRODUCTION HARDENING (Priority: MEDIUM)
**Goal**: Ensure true production readiness with monitoring and optimization

#### Phase 4A: Performance and Stability (Days 16-18)
1. **Performance Optimization**
   - Address test timeout issues indicating performance problems
   - Optimize database queries and connection pooling
   - Implement proper caching strategies
   - Add loading state management

2. **Error Recovery Systems**
   - Implement proper error boundaries in React components
   - Add retry logic for transient failures
   - Create user-friendly error messages with recovery options
   - Add proper logging for production debugging

#### Phase 4B: Production Validation (Days 19-21)
3. **Integration Testing**
   - End-to-end workflow testing from PROMPT to EXPORT
   - Cross-browser compatibility testing
   - Mobile/tablet responsiveness validation
   - Accessibility compliance verification (WCAG 2.1 AA)

4. **Production Deployment Readiness**
   - Docker container optimization
   - Database migration strategy
   - Environment configuration validation
   - Security audit and penetration testing

**Success Criteria Phase 4:**
- ✅ Application performs well under load
- ✅ Graceful error handling and recovery
- ✅ All documented features work end-to-end
- ✅ Production deployment successful
- ✅ Security vulnerabilities addressed

## TECHNICAL IMPLEMENTATION APPROACH

### TDD Methodology (CLAUDE.md Requirement)
1. **Write tests first** for expected behavior
2. **Run tests to confirm they fail** (red phase)
3. **Commit failing tests** to repository
4. **Write implementation code** to pass tests (green phase)
5. **Refactor if needed** while keeping tests passing
6. **Commit working implementation** with all tests passing

### Code Quality Standards (CLAUDE.md Requirement)
- **TypeScript Strict Mode**: No `any` types allowed
- **ESLint Clean**: All linting rules must pass
- **WCAG 2.1 AA Compliance**: Accessibility mandatory
- **ADHD-Friendly Design**: Cognitive load consideration
- **Security First**: No API keys in logs, proper encryption

### Development Commands (From CLAUDE.md)
```bash
# Testing
npm run test                     # Run all tests (vitest run)
npm run test:watch               # Run tests in watch mode (vitest)
npm run test:ui                  # Run tests with UI interface (vitest --ui)

# Development
npm run dev                      # Start dev server with Turbopack
npm run build                    # Build for production  
npm run start                    # Start production server
npm run lint                     # Run ESLint linting

# Database Operations
npx prisma generate              # Generate Prisma client
npx prisma db push               # Push schema changes to database
npx prisma studio                # Open Prisma Studio database browser
```

## ESTIMATED TIMELINE

### Development Phase Duration
- **Phase 1 (Test Infrastructure)**: 5 days
- **Phase 2 (API Reliability)**: 4 days  
- **Phase 3 (Export Completion)**: 6 days
- **Phase 4 (Production Hardening)**: 6 days
- **Buffer for Integration Issues**: 4 days

**Total Estimated Time: 25 days (5 weeks)**

### Realistic Production Readiness
Current optimistic claims of "98% complete" and "Production Ready" are inaccurate. Based on systematic analysis:
- **Current Status**: ~85-90% complete
- **Time to True Production**: 5-7 weeks of focused development
- **Critical Path**: Test infrastructure → API reliability → Export functionality

## RISK MITIGATION

### High-Risk Areas
1. **Test Infrastructure**: Foundation for all other work - must be completed first
2. **Export Functionality**: Complex integration between multiple systems
3. **Database Performance**: Connection pooling and query optimization critical

### Mitigation Strategies
- **Incremental Development**: Complete each phase before proceeding
- **Continuous Testing**: Maintain test suite integrity throughout
- **Regular Commits**: Commit working code frequently to prevent regressions
- **Subagent Validation**: Use subagents to verify implementation quality

## NEXT STEPS AFTER APPROVAL

1. **Phase 1 Execution**: Begin with test infrastructure fixes
2. **Daily Progress Reports**: Update nextsteps.md with daily progress
3. **Commit Strategy**: Follow TDD methodology with frequent commits
4. **Quality Gates**: Each phase must pass success criteria before proceeding
5. **Final Integration**: Create comprehensive pull request when complete

## INVIOLATE RULES COMPLIANCE

✅ **Rule 1**: Read nextsteps.md, README.md, Logging docs, Changelog - COMPLETED
✅ **Rule 2**: NO DEVELOPMENT NOW - This is planning only, awaiting approval
✅ **Rule 3**: Systematic blocker analysis and resolution plan - COMPLETED
🟡 **Rule 4**: Implement solutions (AWAITING APPROVAL)
🟡 **Rule 5**: Commit and create PR (AWAITING APPROVAL)

**STATUS: PLANNING COMPLETE - AWAITING USER APPROVAL TO PROCEED WITH IMPLEMENTATION**