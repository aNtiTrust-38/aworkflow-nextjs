# Development Instructions - Build System Recovery Plan

## Current Status: July 17, 2025
**Phase**: Critical Build System Recovery (Pre-Phase 3)  
**Completion**: ~70% overall (not 82% as documented), blocked by build/test system failures  
**Critical Issue**: Build, lint, and test commands all timeout - preventing any development

## CRITICAL BUILD SYSTEM RECOVERY PLAN (RULE 3)

### **Strategic Analysis from Rule 2 Investigation**

Our subagent investigations revealed a **severe infrastructure crisis** that's more fundamental than documented:

**ACTUAL BLOCKERS DISCOVERED**:
1. **Build System Timeout** - Both `npm run build` and `npm run lint` timeout after 2 minutes
2. **TypeScript Compilation Error** - `vitest.setup.simple.ts(4,20): error TS2540`
3. **Test Infrastructure Failure** - Even minimal tests timeout after 30 seconds
4. **Configuration Chaos** - 10+ vitest config variants from failed attempts
5. **Documentation Mismatch** - Claims 82% complete but basic commands don't work

### **Root Cause Analysis**

1. **Test Collection Performance**: 87+ seconds just to discover tests (should be <1s)
2. **JSdom Environment Overhead**: All tests using heavyweight DOM environment
3. **Missing Test Dependencies**: `@testing-library/jest-dom` not imported
4. **No Parallel Execution**: Sequential test execution with singleFork enabled
5. **Complex Mock Setup**: Heavy mocking slowing test discovery

## Phase 1: Emergency Build Recovery (4-6 hours)

### **Step 1: Fix TypeScript Compilation Error (30 minutes)**
**Issue**: `vitest.setup.simple.ts` line 4 - Cannot assign to read-only NODE_ENV
**Solution**: Remove or modify NODE_ENV assignment
```typescript
// Remove: global.process.env.NODE_ENV = 'test';
// Or use: Object.assign(process.env, { NODE_ENV: 'test' });
```

### **Step 2: Optimize Test Configuration (2 hours)**
**Issue**: Universal jsdom usage and no parallel execution
**Actions**:
1. Create separate test configs:
   - `vitest.node.config.ts` - For API/utility tests (Node environment)
   - `vitest.jsdom.config.ts` - For component tests (jsdom environment)
2. Enable parallel execution:
   - Set `sequence.concurrent: true`
   - Remove `singleFork: true`
3. Fix component test setup:
   - Import `@testing-library/jest-dom` in setup file
   - Add missing matchers

### **Step 3: Resolve Build/Lint Timeout (1 hour)**
**Issue**: Next.js build and ESLint timeout after 2 minutes
**Actions**:
1. Check for circular dependencies
2. Reduce build scope temporarily
3. Add timeout configurations
4. Split linting into chunks

### **Step 4: Clean Configuration (30 minutes)**
**Issue**: Multiple conflicting vitest configs
**Actions**:
1. Archive experimental configs
2. Establish single working configuration
3. Document configuration choices

### **Step 5: Verify Recovery (1 hour)**
**Actions**:
1. Run TypeScript compilation: `npx tsc --noEmit`
2. Run minimal test: `npx vitest run __tests__/test-minimal.test.ts`
3. Run build: `npm run build`
4. Run lint: `npm run lint`

## Phase 2: Test Infrastructure Optimization (2-3 hours)

### **Test Categorization Strategy**
1. **Fast Tests** (<1s each):
   - API endpoint tests (Node environment)
   - Utility function tests
   - Validation tests
2. **Medium Tests** (1-5s each):
   - Component tests (jsdom environment)
   - Integration tests
3. **Slow Tests** (>5s each):
   - Full workflow tests
   - E2E tests

### **Performance Optimization**
1. **Split Test Execution**:
   ```json
   "test:fast": "vitest run --config vitest.node.config.ts",
   "test:components": "vitest run --config vitest.jsdom.config.ts",
   "test:all": "npm run test:fast && npm run test:components"
   ```

2. **Reduce Mock Complexity**:
   - Lazy load heavy dependencies
   - Use minimal mocks for unit tests
   - Full mocks only for integration tests

3. **Test Collection Optimization**:
   - Remove dynamic imports in test setup
   - Simplify mock initialization
   - Use explicit test includes

## Phase 3: Documentation Alignment (1 hour)

### **Update Documentation to Reality**
1. Update nextsteps.md with actual completion percentage (~70%)
2. Document actual blockers and resolutions
3. Update CHANGELOG with infrastructure recovery
4. Create accurate test execution guide

### **Establish Quality Gates**
1. All commits must pass TypeScript compilation
2. Minimal test suite must execute in <30 seconds
3. Build must complete in <5 minutes
4. Documentation claims require test verification

## Success Criteria

### **Immediate Success (Phase 1)**
- [ ] TypeScript compilation passes without errors
- [ ] Minimal test executes in <30 seconds
- [ ] Build completes without timeout
- [ ] Lint runs without timeout

### **Full Recovery (Phase 2-3)**
- [ ] Full test suite executes in <2 minutes
- [ ] Parallel test execution enabled
- [ ] Clear test categorization implemented
- [ ] Documentation matches reality

## Risk Mitigation

### **High Risk Areas**
1. **Deep architectural issues** in build configuration
2. **Hidden circular dependencies** causing timeouts
3. **Test infrastructure** may need complete rebuild

### **Mitigation Strategy**
1. Incremental fixes with verification at each step
2. Create backup branch before major changes
3. Have rollback plan for each modification
4. Consider fresh Next.js setup if critical issues persist

## Next Steps After Recovery

Once build system is functional:

1. **Phase 3A: Test & Deploy** (original plan)
   - Fix remaining test issues
   - Deploy to staging environment
   - Implement monitoring

2. **Phase 3B: Authentication & Users**
   - User registration/login
   - Session management
   - API endpoint protection

3. **Phase 3C: Production Launch**
   - Final security audit
   - Performance optimization
   - Production deployment

## Implementation Timeline

**Day 1 (Today)**:
- Morning: Fix TypeScript error and test configuration
- Afternoon: Resolve build/lint timeouts
- Evening: Verify basic functionality restored

**Day 2**:
- Morning: Implement test optimization
- Afternoon: Clean up configurations
- Evening: Full system verification

**Day 3**:
- Morning: Documentation updates
- Afternoon: Begin Phase 3A planning

---

*Last Updated: July 17, 2025 via Rule 3 comprehensive planning*  
*Based on: Actual subagent investigation findings, not documentation claims*  
*Next Action: Rule 4 - Create tests to verify and fix these blockers*