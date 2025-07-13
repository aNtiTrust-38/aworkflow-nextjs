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
2) NO DEVELOPMENT WILL HAPPEN NOW, THIS IS JUST FOR PLANNING PURPOSES.
    1) Use subagents to verify details or investigate any blockers in development.
    2) Use subagents to investigate questions you may have related to development in a conversation or task.
3) Think hard about and make a plan for how to address blockers in development. If there are no blockers think about and design a plan to move from the current stage of development to the next. If there is no development plan ultrathink of a plan and design one. And plan written should be appended to instructions.md (make it if it doesn't exist and ensure that it is up to date if it does.) and immediate next steps will be written into nextsteps.md (replacing the content and including a summary of development).
4)  Implement your solutions in code. (Verify the reasonability of the solution as it goes. Our goal is efficiency of code. We don't want to over-engineer our solution.)
5) commit the result and create a pull request (if necessary and relevant). update README.md and the changelog.

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