# Development Instructions - Phase 2 Infrastructure Recovery Plan

## Current Status: July 15, 2025
**Phase**: Infrastructure Recovery (Pre-Phase 2)  
**Completion**: 76% overall, blocked by test infrastructure failures  
**Critical Issue**: 5 infrastructure blockers preventing TDD methodology

## Immediate Action Plan - Infrastructure Fixes (3 Hours)

### **Priority 1: Prisma Mock Recovery** (60 minutes)
**Root Cause**: Test-level mock conflicts overriding comprehensive global setup
**Action Items**:
1. Remove duplicate `vi.mock('@/lib/prisma')` from individual test files
2. Fix `vi.mocked(prisma)` usage patterns - use direct import instead
3. Enhance global mock in vitest.setup.ts with missing methods (file model, $transaction, etc.)
4. Standardize test setup pattern across all API tests

### **Priority 2: Test Expectation Modernization** (45 minutes)
**Root Cause**: Tests expect simple error objects, API returns standardized format
**Action Items**:
1. Update 31 folder API test expectations to match standardized error responses
2. Fix authentication error expectations to include full context object
3. Update validation error expectations to match details array format
4. Modernize file upload test expectations

### **Priority 3: File System Mocking** (30 minutes)  
**Root Cause**: Missing `fs/promises` module mock and incomplete method coverage
**Action Items**:
1. Add comprehensive `fs/promises` mock to vitest.setup.ts
2. Include all required methods (access, copyFile, stat, readdir, etc.)
3. Provide both named exports and default export structure
4. Test file system operations in upload functionality

### **Priority 4: Request Headers Safety** (30 minutes)
**Root Cause**: Test mock objects missing headers property causing crashes
**Action Items**:
1. Add headers property to all `createMockReqRes` functions in test files
2. Add null checks to unsafe header access in API handlers (files/upload.ts:186, etc.)
3. Include socket property for IP address access
4. Create safe header access utility function

### **Priority 5: Final Verification** (15 minutes)
**Action Items**:
1. Run crypto tests as baseline (should pass)
2. Test database operations with folder API tests
3. Test file operations with upload API tests
4. Execute full test suite and verify significant improvement

## Implementation Guidelines

### **TDD Methodology**:
1. Write failing tests first to verify blockers exist
2. Implement fixes incrementally 
3. Verify each fix with test execution
4. Commit only verified working solutions

### **Quality Gates**:
- All changes must pass lint and build checks
- Test fixes must be verified with actual test execution
- No claiming completion without demonstrated test passes
- Each blocker fix must be independently verifiable

### **File Change Targets**:
- `vitest.setup.ts` - Enhance global mocks
- `__tests__/api/folders.test.ts` - Update test expectations
- `__tests__/api/files-upload.test.ts` - Fix mocking and expectations
- `pages/api/files/upload.ts` - Add header null checks
- Multiple API test files - Remove duplicate mocks

## Success Criteria for Phase 2 Readiness

### **Infrastructure Fixed State**:
- [ ] Prisma operations work consistently across all tests
- [ ] File upload tests execute without mock errors
- [ ] API responses match test expectations (standardized format)
- [ ] No "undefined property" errors in test execution
- [ ] Test suite runs to completion without infrastructure crashes

### **Development Ready State**:
- [ ] TDD methodology can proceed reliably
- [ ] Clear test failures indicate business logic issues, not infrastructure
- [ ] Consistent development environment established
- [ ] Version control state clean and documented

## Post-Infrastructure Phase 2 Plan

Once infrastructure is genuinely stable:

### **Phase 2A: Authentication Standardization** (1-2 days)
- Standardize authentication across 19 API endpoints
- Implement consistent error responses for auth failures
- Comprehensive session validation testing

### **Phase 2B: Error Handling Standardization** (1-2 days)
- Centralized error response utilities
- Security-conscious error handling patterns
- Standardized input validation across endpoints

### **Phase 2C: Database Optimization** (1 day)
- Transaction handling for multi-step operations
- Connection health monitoring and optimization
- Performance optimization for folder/file operations

---

## COMPREHENSIVE INFRASTRUCTURE RECOVERY PLAN (RULE 3 ADDITION)

### **Strategic Analysis from Subagent Investigations**

Based on comprehensive Rule 2 subagent investigations, this infrastructure crisis requires **systematic architectural fixes**, not point fixes. The documentation claims "98% complete" but reality shows fundamental test infrastructure breakdown.

### **Root Cause Analysis**
- **Mock Architecture Crisis**: Global vs test-specific mock conflicts creating undefined behavior
- **Dynamic Import Bypass**: API handlers use `await import('@/lib/prisma')` which bypasses vitest static mocks
- **Test Pattern Drift**: API responses evolved to standardized format but tests still expect legacy format
- **Documentation Fraud**: Multiple recent commits claim fixes but tests still fail - false progress reporting

### **Emergency Infrastructure Recovery Strategy**

#### **PHASE 1: Critical Blocker Resolution (3-4 hours)**

**BLOCKER 1: Prisma Mock Architecture Rebuild**
- **Root Problem**: Multiple conflicting mock definitions between global setup and test-specific mocks
- **Impact**: Dynamic imports in API handlers bypass mocked Prisma client
- **Solution Strategy**:
  1. **Standardize Mock Strategy**: Remove ALL test-level `vi.mock('@/lib/prisma')` calls
  2. **Enhance Global Mock**: Add missing methods ($connect, $queryRaw, createMany, deleteMany)
  3. **Dynamic Import Handling**: Configure vitest to properly mock dynamic imports
  4. **Type Safety**: Create typed mock access utilities for tests

**BLOCKER 2: Authentication Flow Mismatch**
- **Root Problem**: Tests mock `getServerSession` but handlers use `validateAuth()` wrapper
- **Impact**: All API tests fail authentication before reaching business logic
- **Solution Strategy**:
  1. **Mock Pattern Alignment**: Update test mocks to handle `validateAuth()` pattern
  2. **Session Format Consistency**: Ensure consistent session object format across all tests
  3. **NextAuth Integration**: Fix NextAuth module mocking to match actual usage patterns

**BLOCKER 3: File System Mock Completion**
- **Root Problem**: Dynamic imports for fs/promises bypass static mocks
- **Impact**: File upload tests crash on filesystem operations
- **Solution Strategy**:
  1. **Default Export Addition**: Add proper default export to fs/promises mock
  2. **Dynamic Import Support**: Handle `await import('fs/promises')` patterns
  3. **Method Coverage**: Ensure all file operations (readFile, copyFile, stat) are mocked

**BLOCKER 4: Request Object Mock Infrastructure**
- **Root Problem**: Test request objects missing headers/socket properties
- **Impact**: Error handling crashes on undefined property access
- **Solution Strategy**:
  1. **Complete Request Mocking**: Add headers, socket properties to all test request objects
  2. **Safe Header Access**: Implement null checks in error-utils.ts
  3. **Mock Utilities**: Create standardized request/response mock generators

**BLOCKER 5: Test Expectation Modernization**
- **Root Problem**: Tests expect old error format, API returns standardized format
- **Impact**: 31/31 folder API tests fail due to response format mismatch
- **Solution Strategy**:
  1. **Response Format Alignment**: Update all tests to expect standardized error format
  2. **Authentication Expectations**: Fix auth test expectations to match current session format
  3. **Validation Patterns**: Update validation error expectations to match details array format

#### **PHASE 2: Architecture Stabilization (1-2 days)**

**Infrastructure Hardening**:
- Implement test isolation framework to prevent test contamination
- Add comprehensive error handling and recovery in mock systems
- Create mock verification utilities for debugging
- Establish quality gates requiring test execution before commits

**Documentation Accuracy Recovery**:
- Update all completion percentages to reflect actual infrastructure state
- Correct CHANGELOG claims to match verified implementation
- Implement mandatory verification requirements for documentation updates

#### **PHASE 3: Quality Assurance Framework (ongoing)**

**Testing Standards Implementation**:
- Mandatory test execution before any commit claiming fixes
- Automated infrastructure health verification
- Regular infrastructure health monitoring
- Quality gate enforcement for future changes

### **Implementation Verification Protocol**

Each fix must be verified with actual test execution:

```bash
# Phase 1 Verification Steps
npm run test __tests__/crypto.test.ts          # Baseline (should pass)
npm run test __tests__/api/folders.test.ts     # Prisma/Auth verification
npm run test __tests__/api/files-upload.test.ts # File system verification
npm run test                                   # Full suite verification
```

### **Success Criteria for Phase 2 Readiness**

**Infrastructure Fixed State**:
- [ ] Prisma operations work consistently across all tests
- [ ] File upload tests execute without mock errors  
- [ ] API responses match test expectations (standardized format)
- [ ] No "undefined property" errors in test execution
- [ ] Test suite runs to completion without infrastructure crashes
- [ ] Documentation accurately reflects actual implementation state

**Development Ready State**:
- [ ] TDD methodology can proceed reliably
- [ ] Clear distinction between infrastructure issues and business logic failures
- [ ] Consistent development environment across team
- [ ] Version control state clean and properly documented

### **Critical Implementation Notes**

1. **No Point Fixes**: This requires systematic architectural changes, not individual bug fixes
2. **Verification Required**: Every fix must be proven with actual test execution
3. **Documentation Accuracy**: All claims must be verified before documentation updates
4. **Quality Gates**: Implement mandatory verification before claiming completion

**ESTIMATED RECOVERY TIME**: 3-4 hours emergency fixes, 1-2 days proper architecture
**RISK LEVEL**: HIGH-CRITICAL - cannot proceed with reliable development until fixed

*Last Updated: July 15, 2025 via Rule 3 comprehensive planning*  
*Next Phase: Rule 4 - Create failing tests to verify blockers*
- Connection health monitoring and metrics
- Performance optimization for file operations

## Risk Mitigation

### **High-Risk Areas**:
- Mock configuration conflicts between global and test-level setups
- Test expectation drift from API implementation changes
- File system operation mocking complexity

### **Mitigation Strategies**:
- Implement each fix incrementally with immediate verification
- Maintain test isolation to prevent mock state pollution
- Document all mock patterns for consistency
- Create verification protocol to catch regressions

### **Rollback Plan**:
- Each fix can be implemented and tested independently
- Git commits for each completed blocker resolution
- Ability to isolate and address individual failures

## Critical Success Factors

1. **Accuracy in Documentation**: Only claim completion when verified with tests
2. **Test-First Validation**: Every fix must be proven with actual test execution  
3. **Infrastructure Priority**: No feature development until test foundation is stable
4. **Systematic Approach**: Address blockers in priority order with verification at each step

**Estimated Time to Phase 2 Readiness**: 3-4 hours if emergency fixes successful  
**Next Milestone**: Reliable TDD development environment for Phase 2 implementation

---
*Last Updated: July 15, 2025*  
*Next Update Required: After infrastructure emergency fixes completion*