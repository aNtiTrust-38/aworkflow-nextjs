# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Model Selection Framework
Development uses a tiered model framework based on task complexity:
- **Sonnet 3.6**: Default for most development tasks
- **Sonnet 4**: For moderate complexity tasks requiring deeper analysis
- **Opus 4**: MANDATORY for "think hard", "think harder", and "ultrathink" tasks
- **Always notify user when switching models**

## The Ten Universal Commandments
1. **Thou shalt ALWAYS use MCP tools before coding**
2. **Thou shalt NEVER assume; always question**
3. **Thou shalt write code that's clear and obvious**
4. **Thou shalt be BRUTALLY HONEST in assessments**
5. **Thou shalt PRESERVE CONTEXT, not delete it**
6. **Thou shalt make atomic, descriptive commits**
7. **Thou shalt document the WHY, not just the WHAT**
8. **Thou shalt test before declaring done**
9. **Thou shalt handle errors explicitly**
10. **Thou shalt treat user data as sacred**

## Inviolate Rules for Development
1. **Before each phase of development read:**
   1. nextsteps.md
   2. README.md
   3. Logging documentation
   4. Changelog
   **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 2**

2. **NO DEVELOPMENT WILL HAPPEN NOW, THIS IS JUST FOR PLANNING PURPOSES.**
   1. Use subagents to verify details or investigate any blockers in development.
   2. Use subagents to investigate questions you may have related to development in a conversation or task.
   **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 3**

3. **Think hard about and make a plan** for how to address blockers in development. If there are no blockers think about and design a plan to move from the current stage of development to the next. If there is no development plan ultrathink of a plan and design one. 
   - **Model Switch Required**: "think hard" and "ultrathink" require switching to Opus 4 model
   - Plan written should be appended to instructions.md (make it if it doesn't exist and ensure that it is up to date if it does.)
   - Immediate next steps will be written into nextsteps.md (replacing the content and including a summary of development)
   **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 4**

4. **Create tests that will meet the plan** developed in step 3. At this phase **NO** implementation will be done. This is strictly designing the RED phase of our TDD methodology.
   - Use subagents to ensure that RED tests are efficient and comprehensive
   **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 5**

5. **Implement your solutions in code** to pass the existing tests. The GREEN phase - **NO** tests can be changed. Code must be implemented to pass the existing tests. (Verify the reasonability of the solution as it goes. Our goal is efficiency of code. We don't want to over-engineer our solution.)
   - After each green test verify that the solution has actually been implemented.
   - Use subagents to ensure implementation isn't overfitting the tests
   **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 6**

6. **Commit the result and create a pull request** (if necessary and relevant). Update README.md and the changelog.
   **STOP AND WAIT FOR USER APPROVAL AFTER COMPLETING THIS RULE**

## Core Principles

### Use Git Tools
- **Before modifying files** - understand history
- **When tests fail** - check recent changes  
- **Finding related code** - git grep
- **Understanding features** - follow evolution
- **Checking workflows** - CI/CD issues

### Final Reminders
- Codebase > Documentation > Training data (in order of truth)
- Research current docs, don't trust outdated knowledge
- Ask questions early and often
- Use slash commands for consistent workflows
- Derive documentation on-demand
- Extended thinking for complex problems
- Visual inputs for UI/UX debugging
- Test locally before pushing
- Think simple: clear, obvious, no bullshit

### Coding Rules
1. Write tests based on expected input/output pairs (TDD best practice)
2. Run tests to confirm that they fail (no implementation at this stage)
3. Commit the tests when satisfied
4. Write code that passes the tests (do not modify tests)
5. Keep going until all tests pass
6. Once satisfied and approved, always commit the code

### Additional Guidelines
- **All code browsing, internet access, and file operations should run through puppeteer mcp**
- **Subagent Usage**: Essential for investigation, verification, and ensuring test/implementation quality
- At the end of each development phase, update documentation and explicitly echo what the next stage is
- Ensure that nextsteps.md is explicitly notated that the phase is complete

## Global Commands

### /resync
- **Purpose**: Force development to perform {/clear} and restart the CLAUDE.md development loop
- **Action**: Clear all context and begin again at Inviolate Rule 1
- **Usage**: When development has gone off-track or user wants to restart the cycle

### /document
- **Purpose**: Perform comprehensive codebase review and update all relevant documentation
- **Implementation**:
  1. Scan all source files for recent changes
  2. Update README.md, CHANGELOG.md, nextsteps.md, and any API documentation
  3. Run linting and type checking
  4. Stage all documentation changes
  5. Create commit with descriptive message
  6. Push to remote repository
- **Commit Message Format**: "docs: comprehensive documentation update [feature/changes summary]"

### /devstatus
- **Purpose**: Stop development, clear context, and provide comprehensive status summary
- **Implementation**:
  1. Stop development and clear context (/clear)
  2. Analyze current development state
  3. Calculate completion percentages by major areas
  4. Identify critical blockers and areas of concern
  5. Provide structured status report
  6. Update nextsteps.md with comprehensive development status

### /verifyphase
- **Purpose**: Analyze the last sprint and verify implementation matches the last acted upon plan
- **Implementation**:
  1. Identify last development sprint from commits and documentation
  2. Compare planned deliverables vs actual implementation
  3. Document gaps and discrepancies
  4. Provide verification report with quality assessment
  5. Evaluate plan accuracy and suggest improvements

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production  
npm run start            # Start production server
npm run lint             # Run ESLint linting

# Testing
npm run test             # Run all tests (vitest run)
npm run test:watch       # Run tests in watch mode (vitest)
npm run test:ui          # Run tests with UI interface (vitest --ui)

# Database Operations
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes to database
npx prisma studio        # Open Prisma Studio database browser

# Desktop App Development
npm run electron:dev     # Start Electron dev environment
npm run electron:build   # Build desktop app
npm run electron:pack    # Package desktop app

# Specific Test Categories
npx vitest run __tests__/crypto.test.ts               # Encryption tests (23 tests)
npx vitest run __tests__/user-settings-storage.test.ts # Settings storage tests
npx vitest run __tests__/phase2/authentication-standardization.test.ts # Auth tests
npx vitest run __tests__/api/                         # API endpoint tests
npx vitest run __tests__/infrastructure/              # Infrastructure tests
npx vitest run __tests__/phase2/                      # Phase 2 TDD tests
```

### Critical Test Notes
- **Test Suite Timeout**: Full test suite currently times out after 3 minutes
- **Run individual test files** to avoid timeout issues
- **Use `vitest.setup.simple.ts`** for test configuration
- **Authentication tests**: 13/13 passing with standardized error format
- **Infrastructure tests**: Comprehensive coverage of Prisma mocking and error handling

## Architecture Overview

### Academic Workflow System (6-Step Process)
The application follows a structured 6-step academic workflow:
1. **PROMPT**: Research question definition
2. **GOALS**: ADHD-friendly goal setting with structure outlines
3. **RESEARCH**: AI-powered research with source management
4. **GENERATE**: Content generation with academic integrity safeguards
5. **REFINE**: Content analysis and refinement tools
6. **EXPORT**: Professional PDF/Word export with citations

**Main Component**: `src/app/WorkflowUI.tsx` orchestrates the entire workflow with dynamic component loading and state management.

### Multi-LLM AI Provider System
- **Intelligent Routing**: `lib/ai-providers/router.ts` automatically selects optimal provider based on task type
- **Provider Classes**: Anthropic (`lib/ai-providers/anthropic.ts`) and OpenAI (`lib/ai-providers/openai.ts`) extend base class
- **Failover System**: Automatic provider switching if primary fails
- **Budget Tracking**: Real-time cost monitoring with configurable monthly limits
- **Context-Aware Routing**: `lib/ai-providers/context-aware-router.ts` optimizes provider selection

### Authentication & Security Architecture
- **Authentication Utilities**: `lib/auth-utils.ts` provides `validateAuth()` with standardized error responses
- **Encrypted Storage**: `lib/encryption-service.ts` uses AES-256-GCM for API keys and sensitive data
- **Error Handling**: `lib/error-utils.ts` provides standardized error responses across all 19 API endpoints
- **Validation**: `lib/validation-utils.ts` provides comprehensive field-level validation utilities

### Settings & Configuration System
- **User Settings**: `lib/user-settings-storage.ts` manages encrypted user preferences
- **Database Schema**: Prisma ORM with SQLite - User, UserSettings, Paper, Reference, File, Folder models
- **Setup Wizard**: 4-step guided configuration in `src/app/settings/page.tsx`
- **GUI Dashboard**: Professional settings management with real-time API key testing

### Zotero Integration
- **Zotero Client**: `lib/zotero/client.ts` handles API communication
- **Sync Service**: `lib/zotero/sync.ts` manages bidirectional synchronization
- **Conflict Resolution**: Intelligent handling of duplicate references
- **Export Support**: `lib/export/zotero-exporter.ts` for BibTeX and academic formats

### Testing Strategy
- **Vitest Framework**: 87+ test files covering all layers
- **TDD Methodology**: Red-Green-Refactor cycle with comprehensive coverage
- **Test Categories**:
  - **API Testing**: `next-test-api-route-handler` for endpoint validation
  - **Component Testing**: React Testing Library for UI components
  - **Security Testing**: Encryption and authentication validation
  - **Infrastructure Testing**: Prisma mocking and error handling
  - **Accessibility Testing**: WCAG 2.1 AA compliance verification

## Key Implementation Patterns

### API Provider Usage
```typescript
// Use the AI router for intelligent provider selection
import { AIRouter } from 'lib/ai-providers/router';
const router = new AIRouter();
const response = await router.generateContent(prompt, 'research');
```

### Standardized Error Handling
```typescript
// All API endpoints use standardized error responses
import { createErrorResponse } from 'lib/error-utils';
import { validateAuth } from 'lib/auth-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authentication first
  const session = await validateAuth(req, res);
  if (!session) return; // validateAuth handles response
  
  // Then method validation
  if (req.method !== 'POST') {
    return createErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed', req);
  }
}
```

### Settings Access
```typescript
// Always use encrypted settings storage
import { UserSettingsStorage } from 'lib/user-settings-storage';
const settings = await UserSettingsStorage.getSettings(userId);
```

### Validation Utilities
```typescript
// Use comprehensive validation utilities
import { validateRequired, validateEmail, ValidationErrorCollector } from 'lib/validation-utils';

const collector = new ValidationErrorCollector();
const emailValidation = validateEmail(email, 'email');
if (!emailValidation.valid) collector.addError(emailValidation.error);
```

## Development Guidelines

### Current Development Status (Phase 2B Complete)
- **82% Complete**: Major milestone achieved with error handling standardization
- **Authentication**: 9 critical API endpoints now secured with standardized auth
- **Error Handling**: All 19 API endpoints use consistent error format
- **Test Infrastructure**: Fully functional with TDD methodology
- **Next Priority**: Fix test suite timeout issue before new development

### Required Testing Patterns
- **TDD Methodology**: Write failing tests first, then implement to pass
- **Authentication Testing**: Use `next-test-api-route-handler` with proper mocking
- **Error Handling Testing**: Verify standardized error response format
- **Component Testing**: React Testing Library with accessibility validation
- **Infrastructure Testing**: Mock Prisma operations and database interactions

### Security Requirements
- **API Keys**: Never log or expose in console/errors - use encryption service
- **Authentication**: All endpoints require `validateAuth()` before processing
- **Input Validation**: Use validation utilities for all user inputs
- **Error Responses**: Use standardized format to prevent information leakage
- **Database Access**: Always use Prisma client with proper error handling

### Performance Considerations
- **Dynamic Imports**: Heavy components are lazy-loaded (WorkflowUI pattern)
- **Component Preloading**: `lib/performance/component-preloader.ts` for optimization
- **Response Caching**: `lib/performance/response-cache.ts` for expensive operations
- **Database Optimization**: Use efficient queries and proper indexing

### Accessibility Standards (WCAG 2.1 AA Compliant)
- **Keyboard Navigation**: Support Arrow keys, Tab, Ctrl+K command palette
- **Screen Reader Support**: Proper ARIA labels and live announcements
- **Focus Management**: Visible focus indicators and logical tab order
- **Touch Targets**: Minimum 44px for mobile accessibility
- **Color Contrast**: High contrast mode support

## File Structure & Key Locations

### Core Application Files
- `src/app/WorkflowUI.tsx` - Main workflow orchestration
- `src/app/page.tsx` - Application entry point
- `src/app/settings/page.tsx` - Settings management interface

### Library Architecture
- `lib/ai-providers/` - Multi-LLM system with intelligent routing
- `lib/error-utils.ts` - Standardized error handling across all endpoints
- `lib/auth-utils.ts` - Authentication utilities with session validation
- `lib/validation-utils.ts` - Comprehensive input validation
- `lib/encryption-service.ts` - AES-256-GCM encryption for sensitive data
- `lib/user-settings-storage.ts` - Encrypted user preferences management
- `lib/zotero/` - Zotero integration with sync and export capabilities

### API Endpoints (pages/api/)
- **19 API endpoints** with standardized error handling
- **9 secured endpoints** with authentication middleware
- **Pattern**: Authentication → Method validation → Input validation → Business logic

### Test Architecture
- `__tests__/phase2/` - Phase 2 TDD development tests
- `__tests__/api/` - API endpoint testing
- `__tests__/infrastructure/` - Infrastructure and mocking tests
- `vitest.setup.simple.ts` - Test configuration (avoid global fetch mock)

## Important Instruction Reminders
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) unless explicitly requested
- Only use emojis if the user explicitly requests it
- **Use TDD methodology**: Red tests first, then Green implementation
- **Test suite timeout**: Run individual test files to avoid 3-minute timeout
- **Authentication pattern**: Always validate auth before method/input validation