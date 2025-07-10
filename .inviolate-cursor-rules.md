# Inviolate Cursor Rules

## 🔒 OPERATIONAL PROTOCOL

### 1. Mode Selection is MANDATORY
- **ALWAYS start each session**: Ask "Planner or Executor mode?" and wait for confirmation
- **NEVER proceed without mode selection**: This ensures proper context and approach
- **Exception**: YOLO mode when explicitly authorized (see YOLO MODE section below)

### 2. File Reading is MANDATORY
- **Read existing files FIRST**: Use @ syntax to include relevant files before any changes
- **Never make assumptions**: Always verify current state by reading actual files
- **Include all related files**: Test files, implementation files, configuration files

### 3. TDD Protocol is MANDATORY
- **Follow .tdd-rules-cursor.md**: This file contains non-negotiable TDD protocols
- **Test-Driven Development sequence**:
  1. Write failing test (RED phase)
  2. Write minimal code to pass (GREEN phase)
  3. Refactor if needed (REFACTOR phase)
- **No implementation without failing test first**
- **Document each TDD cycle in .cursor/scratchpad.md**

## 🎯 DEVELOPMENT DISCIPLINE

### 1. Test Integrity
- **Maintain test compatibility**: ALL existing tests must continue to pass
- **Never skip tests**: If a test fails, fix it before proceeding
- **Test coverage**: New features require comprehensive test coverage

### 2. Error Handling
- **Comprehensive error handling**: All user interactions must handle errors gracefully
- **User-friendly error messages**: Errors should guide users to resolution
- **Logging and debugging**: Include appropriate logging for troubleshooting

### 3. Security
- **Environment security**: Never commit API keys, always use .env variables
- **Input validation**: Validate and sanitize all user inputs
- **Authentication**: Respect authentication boundaries

## 📊 QUALITY STANDARDS

### 1. User Focus
- **Academic integrity**: This tool assists learning, NEVER replaces student work
- **ADHD accessibility**: Every interface must be clear, simple, and processable
- **Professional UX**: Users expect polished, intuitive interfaces

### 2. Performance
- **API response times**: Should complete within reasonable timeframes (<30s)
- **Optimize for user experience**: Loading states, progress indicators
- **Resource efficiency**: Minimize unnecessary API calls

### 3. Code Quality
- **TypeScript strict mode**: All code must pass strict TypeScript checks
- **ESLint compliance**: Follow established linting rules
- **Clear naming**: Variables, functions, and files should be self-documenting

## 📝 COMMUNICATION REQUIREMENTS

### When Starting a Task:
```
MODE: [Planner/Executor]
CURRENT TASK: [Specific feature/component]
SUCCESS CRITERIA: [How to know when done]
FILES NEEDED: [@file1 @file2]
```

### When Completing a Task:
```
STATUS: [Complete/Blocked/In Progress]
TESTS: [Pass/Fail count]
ISSUES: [Any problems encountered]
NEXT: [What should happen next]
```

### Progress Documentation
- **Update .cursor/scratchpad.md**: After each significant step
- **Include in updates**:
  - Current TDD phase (RED/GREEN/REFACTOR)
  - Test results
  - Blockers or issues
  - Next steps

## 🚀 YOLO MODE (Special Authorization Required)

When explicitly authorized for YOLO mode:

### YOLO Rules:
- **Continue with high-level tasks**: Work through task breakdown until completion
- **Skip mode selection**: Begin implementing immediately
- **Skip permission requests**: Make smart implementation decisions
- **Maintain quality**: Still follow TDD, keep tests green
- **Auto-commit**: Commit frequently with clear messages

### YOLO Boundaries:
- **PAUSE if tests fail >5 times**: Stop and report the issue
- **PAUSE for architectural decisions**: Don't make major structural changes
- **PAUSE for external dependencies**: Don't add new packages without approval
- **ALWAYS maintain existing functionality**: Don't break working features

### YOLO Communication:
- Still update .cursor/scratchpad.md regularly
- Commit messages should be descriptive
- Report completion of major milestones

## ⚠️ CRITICAL REMINDERS

1. **Academic Integrity**: The app MUST NOT write papers for students
2. **ADHD Support**: Every interface element must reduce cognitive load
3. **Quality Sources**: Exclude forums, prioritize academic sources
4. **APA 7 Only**: Single citation format to reduce confusion
5. **TDD Always**: No implementation without failing test first

## 🛑 NEVER DO

- **Never skip TDD protocol**
- **Never commit API keys or secrets**
- **Never break existing tests**
- **Never implement features that write papers for students**
- **Never proceed without reading relevant files first**
- **Never ignore error handling**
- **Never make assumptions about file contents**

## ✅ ALWAYS DO

- **Always follow TDD cycle**
- **Always read files before editing**
- **Always maintain test coverage**
- **Always handle errors gracefully**
- **Always document progress**
- **Always prioritize user needs**
- **Always maintain academic integrity**