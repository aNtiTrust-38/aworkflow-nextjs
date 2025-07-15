# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Specific Test Categories
npx vitest run __tests__/ai-providers.test.ts          # AI provider tests
npx vitest run __tests__/crypto.test.ts               # Encryption tests  
npx vitest run __tests__/user-settings-storage.test.ts # Settings storage tests
npx vitest run __tests__/components/                   # Component tests
npx vitest run __tests__/api/                         # API endpoint tests
```

## First Line Directive
- CLAUDE.md MUST be followed explicitly.

## Global Commands
### /resync
- **Purpose**: Force development to perform {/clear} and restart the CLAUDE.md development loop
- **Action**: Clear all context and begin again at Inviolate Rule 1
- **Usage**: When development has gone off-track or user wants to restart the cycle
- **Implementation**: 
  1. Clear all previous context and todos
  2. Start fresh at Rule 1 (read nextsteps.md, README.md, logging docs, changelog)
  3. Wait for user approval at each mandatory stop point

### /document
- **Purpose**: Perform comprehensive codebase review and update all relevant documentation
- **Action**: Review codebase changes, update documentation, commit, and push
- **Usage**: When significant changes have been made and documentation needs updating
- **Implementation**:
  1. **Codebase Review Phase**:
     - Scan all source files for recent changes
     - Identify new features, API changes, and architectural updates
     - Review test coverage and functionality changes
     - Analyze package.json dependencies and scripts
  2. **Documentation Update Phase**:
     - Update README.md with new features and changes
     - Update CHANGELOG.md with version entries
     - Update nextsteps.md with current development status
     - Update any API documentation or user guides
     - Update CLAUDE.md if development patterns changed
  3. **Validation Phase**:
     - Run linting and type checking
     - Verify documentation links and formatting
     - Ensure all changes are consistent
  4. **Commit and Push Phase**:
     - Stage all documentation changes
     - Create commit with descriptive message
     - Push to remote repository
- **Commit Message Format**: "docs: comprehensive documentation update [feature/changes summary]"

### /devstatus
- **Purpose**: Stop development, clear context, and provide comprehensive status summary
- **Action**: Analyze current development state with completion percentage and concern areas
- **Usage**: When you need a clear overview of project status and development progress
- **Implementation**:
  1. **Stop Development**: Halt any ongoing development work immediately
  2. **Clear Context**: Execute the /clear command to ensure fresh analysis
  3. **Status Analysis Phase**:
     - Read nextsteps.md for current phase and blockers
     - Read CHANGELOG.md for recent progress
     - Read README.md for feature completion status
     - Scan test results and coverage reports
     - Analyze git status and recent commits
  4. **Completion Assessment**:
     - Calculate overall project completion percentage
     - Break down completion by major areas (UI, API, Testing, Documentation)
     - Identify completed features vs. planned features
     - Assess code quality and technical debt
  5. **Areas of Concern Analysis**:
     - Identify critical blockers and failed tests
     - Highlight security vulnerabilities or technical debt
     - Note missing documentation or incomplete features
     - Flag performance issues or accessibility gaps
     - Identify dependency issues or outdated packages
  6. **Summary Report Format**:
     ```
     ## Development Status Report
     **Overall Completion**: X%
     **Current Phase**: [Phase Name]
     **Last Updated**: [Date]
     
     ### Completion Breakdown:
     - Core Features: X%
     - UI/UX: X%
     - API Endpoints: X%
     - Testing: X%
     - Documentation: X%
     - Security: X%
     
     ### Areas of Concern:
     🚨 **Critical**: [List critical issues]
     ⚠️  **High**: [List high priority issues]
     📝 **Medium**: [List medium priority issues]
     
     ### Next Recommended Actions:
     1. [Immediate next step]
     2. [Second priority]
     3. [Third priority]
     ```
  7. **Update nextsteps.md**: Rewrite nextsteps.md with comprehensive development status
     - Replace entire contents with current development summary
     - Include snapshot of current blockers and their solutions
     - Add completion percentages and phase information
     - Document immediate next actions and timeline estimates
     - Include risk assessment and mitigation strategies
     - Provide technical debt summary and resolution plans

### /verifyphase
- **Purpose**: Analyze the last sprint and verify implementation matches the last acted upon plan
- **Action**: Compare planned vs actual development outcomes and identify discrepancies
- **Usage**: After completing development work to validate execution against planning
- **Implementation**:
  1. **Sprint Identification**: Determine the last development sprint/phase from recent commits and documentation
  2. **Plan Analysis Phase**:
     - Read previous version of nextsteps.md or development plans
     - Identify what was supposed to be accomplished
     - Extract success criteria and deliverables from the plan
     - Note estimated timelines and resource allocation
  3. **Actual Implementation Analysis**:
     - Review recent git commits and their messages
     - Run current tests to validate claimed functionality
     - Check current codebase state vs planned outcomes
     - Analyze test pass/fail rates vs expected results
  4. **Comparison and Verification**:
     - Compare planned deliverables vs actual implementation
     - Identify completed items vs missed items
     - Analyze quality of implementation vs plan requirements
     - Check if success criteria were actually met
  5. **Discrepancy Analysis**:
     - Document gaps between plan and execution
     - Identify root causes for any missed objectives
     - Assess impact of deviations on overall project
     - Note any unplanned work that was completed
  6. **Verification Report Format**:
     ```
     ## Sprint Verification Report
     **Sprint Period**: [Date Range]
     **Planned Objectives**: [List from plan]
     **Actual Outcomes**: [List from implementation]
     
     ### Verification Results:
     ✅ **Completed as Planned**: [List items]
     ⚠️  **Partially Completed**: [List with details]
     ❌ **Not Completed**: [List with reasons]
     🆕 **Unplanned Work**: [List additional items]
     
     ### Quality Assessment:
     - **Test Coverage**: Expected vs Actual
     - **Performance**: Meets requirements (Y/N)
     - **Documentation**: Updated appropriately (Y/N)
     - **Code Quality**: Passes all checks (Y/N)
     
     ### Discrepancy Analysis:
     - **Major Gaps**: [Critical missed items]
     - **Root Causes**: [Why objectives were missed]
     - **Impact Assessment**: [Effect on project timeline]
     
     ### Recommendations:
     1. [Immediate actions needed]
     2. [Process improvements]
     3. [Next sprint adjustments]
     ```
  7. **Plan Accuracy Assessment**: Evaluate how realistic the original plan was and suggest improvements for future planning

## Architecture Overview

### Multi-LLM AI Provider System
- **Intelligent Routing**: `lib/ai-providers/router.ts` automatically selects optimal provider (Claude vs GPT-4o) based on task type
- **Provider Classes**: Each provider (`anthropic.ts`, `openai.ts`) extends base class with unified interface
- **Failover**: Automatic provider switching if one fails
- **Budget Tracking**: Real-time cost monitoring with configurable monthly limits

### Security & Settings Architecture  
- **Encrypted Storage**: AES-256-GCM encryption for API keys and sensitive data (`lib/crypto.ts`, `lib/encryption-service.ts`)
- **Settings Management**: Centralized user settings with GUI dashboard (`components/SettingsDashboard.tsx`)
- **Setup Wizard**: 4-step guided configuration for new users (`components/SetupWizard.tsx`)
- **Database**: Prisma ORM with SQLite (dev) - schema includes User, UserSettings, Paper, Reference models

### Workflow System
- **6-Step Process**: PROMPT → GOALS → RESEARCH → GENERATE → REFINE → EXPORT
- **Main Component**: `src/app/WorkflowUI.tsx` orchestrates entire academic workflow
- **Dynamic Loading**: Heavy components lazy-loaded for performance
- **ADHD-Friendly**: Reduced cognitive load, clear visual hierarchy, accessible navigation

### Component Architecture
- **Command Palette**: VS Code-inspired fuzzy search interface (`components/CommandPalette.tsx`)
- **Navigation**: Responsive stepper with keyboard shortcuts (`components/Navigation.tsx`)
- **Citation Management**: Integration with Zotero API for reference sync (`src/app/CitationManager.tsx`)
- **Export System**: PDF/Word generation with proper formatting (`lib/export/`)

### Testing Strategy
- **Vitest Framework**: Comprehensive test coverage across all layers
- **Component Testing**: React Testing Library for UI components
- **API Testing**: Supertest for endpoint validation
- **Security Testing**: Encryption and settings storage validation
- **Accessibility Testing**: WCAG 2.1 AA compliance verification

## Key Implementation Patterns

### API Provider Usage
```typescript
// Use the AI router for intelligent provider selection
import { AIRouter } from 'lib/ai-providers/router';
const router = new AIRouter();
const response = await router.generateContent(prompt, 'research'); // Auto-selects Claude for research
```

### Settings Access
```typescript
// Always use encrypted settings storage
import { UserSettingsStorage } from 'lib/user-settings-storage';
const settings = await UserSettingsStorage.getSettings(userId);
```

### Database Operations
```typescript
// Use Prisma client for all database operations
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### Error Handling
- Use `ErrorMessage` component for user-facing errors
- Implement proper loading states with `LoadingSpinner`
- Follow fail-safe patterns (don't block app functionality)

## Development Guidelines

### Required Testing
- Write tests for all new AI provider integrations
- Test encryption/decryption for any settings-related code
- Validate accessibility with keyboard navigation tests
- Test responsive design across viewport sizes

### Security Requirements
- Never log or expose API keys in console/errors
- Use encryption service for all sensitive data storage
- Validate API keys before storage using test endpoints
- Implement proper CORS and authentication checks

### Performance Considerations
- Use dynamic imports for heavy components
- Implement proper loading states for async operations
- Cache expensive computations where appropriate
- Monitor AI provider costs and usage

### Accessibility Standards
- Maintain WCAG 2.1 AA compliance
- Support keyboard navigation with arrow keys and shortcuts
- Provide screen reader announcements for state changes
- Ensure minimum 44px touch targets for mobile

## Inviolate Rules for Development
1) Before each phase of development read:
    1) nextsteps.md
    2) README.md
    3) Logging documentation
    4) Changelog
    **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 2**

2) NO DEVELOPMENT WILL HAPPEN NOW, THIS IS JUST FOR PLANNING PURPOSES.
    1) Use subagents to verify details or investigate any blockers in development.
    2) Use subagents to investigate questions you may have related to development in a conversation or task.
    **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 3**

3) Think hard about and make a plan for how to address blockers in development. If there are no blockers think about and design a plan to move from the current stage of development to the next. If there is no development plan ultrathink of a plan and design one. And plan written should be appended to instructions.md (make it if it doesn't exist and ensure that it is up to date if it does.) and immediate next steps will be written into nextsteps.md (replacing the content and including a summary of development).
    **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 4**

4) Create tests that will meet the plan developed in step 3. At this phase **NO** implementation will be done. This is strictly designing the RED phase of our TDD methodology.
    **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 5**

5) Implement your solutions in code to pass the existing tests. The GREEN phase - **NO** tests can be changed. Code must be implemented to pass the existing tests. (Verify the reasonability of the solution as it goes. Our goal is efficiency of code. We don't want to over-engineer our solution.)
    - After each green test verify that the solution has actually been implemented.
    **STOP AND WAIT FOR USER APPROVAL BEFORE PROCEEDING TO RULE 6**

6) commit the result and create a pull request (if necessary and relevant). update README.md and the changelog.
    **STOP AND WAIT FOR USER APPROVAL AFTER COMPLETING THIS RULE**

## Coding Rules
1) Write tests based on expected input/output pairs.
    1) We are operating in a TDD best practice mode.
2) Run tests to confirm that they fail.
    1) Do not not write any implementation code at this stage
3) Commit the tests when you're satisfied with them.
4) Write code that passes the tests
    1) Do not modify the tests.
    2) Keep going until all tests pass.
    3) Use subagents to ensure that implementation isn't overfitting the tests.
5) Once satisfied with the code (and approved by me) always commit the code.

## Inviolate Rules
- **All code browsing, internet access, and file operations should run through puppeteer mcp.**

## TDD Guidelines
- **Red Phase Guidelines**:
  - step 5 is the green phase and **NO** test can me changed. Code must be implemented to pass the existing test.
  - **Subagents should be used to ensure that RED tests (Rule 4) are efficient**

## Additional Guidelines
- Another inviolate rule: At the end of each development phase (when a phase of the plan is completed) Update documentation and explicitly echo to the user what the next stage is. Ensure that nextsteps.md is explicitly notated that the phase is complete.