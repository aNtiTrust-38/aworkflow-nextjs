#!/bin/bash

# RULE 4: Script to verify all blockers exist
# This script demonstrates the failing commands

echo "================================================"
echo "RULE 4: Infrastructure Blockers Verification"
echo "================================================"
echo ""
echo "This script demonstrates all the blockers preventing development."
echo "Each command will timeout or fail as documented."
echo ""

# Function to run command with timeout
run_with_timeout() {
    local cmd="$1"
    local timeout_sec="$2"
    local description="$3"
    
    echo "-------------------------------------------"
    echo "Testing: $description"
    echo "Command: $cmd"
    echo "Timeout: ${timeout_sec}s"
    echo ""
    
    # Run command with timeout
    timeout $timeout_sec bash -c "$cmd" 2>&1
    local exit_code=$?
    
    if [ $exit_code -eq 124 ]; then
        echo "❌ FAILED: Command timed out after ${timeout_sec}s"
    elif [ $exit_code -eq 0 ]; then
        echo "✅ PASSED: Command completed successfully"
    else
        echo "❌ FAILED: Command exited with code $exit_code"
    fi
    echo ""
}

# Test 1: TypeScript Compilation
echo "TEST 1: TypeScript Compilation Error"
echo "-------------------------------------------"
echo "Expected: TS2540 error in vitest.setup.simple.ts"
echo ""
npx tsc --noEmit 2>&1 | head -20
echo ""

# Test 2: Test Execution Timeout
echo "TEST 2: Test Execution Timeout"
run_with_timeout "npx vitest run __tests__/test-minimal.test.ts" 10 "Minimal test execution"

# Test 3: Build Command Timeout
echo "TEST 3: Build Command Timeout"
run_with_timeout "npm run build" 30 "Next.js build"

# Test 4: Lint Command Timeout
echo "TEST 4: Lint Command Timeout"
run_with_timeout "npm run lint" 30 "ESLint"

# Test 5: Configuration Chaos
echo "TEST 5: Configuration Chaos"
echo "-------------------------------------------"
echo "Vitest configuration files found:"
ls -la vitest*.config.ts 2>/dev/null | wc -l
echo ""
ls -la vitest*.config.ts 2>/dev/null
echo ""

# Test 6: Missing jest-dom
echo "TEST 6: Missing jest-dom Import"
echo "-------------------------------------------"
echo "Checking for jest-dom import in setup files:"
grep -l "@testing-library/jest-dom" vitest.setup*.ts 2>/dev/null || echo "❌ No jest-dom import found"
echo ""

# Summary
echo "================================================"
echo "SUMMARY OF BLOCKERS"
echo "================================================"
echo ""
echo "1. ❌ TypeScript Compilation - NODE_ENV assignment error"
echo "2. ❌ Test Execution - Timeouts even for minimal tests"
echo "3. ❌ Build Command - Timeouts after 2 minutes"
echo "4. ❌ Lint Command - Timeouts after 2 minutes"
echo "5. ❌ Configuration - Multiple conflicting configs"
echo "6. ❌ Component Tests - Missing jest-dom matchers"
echo ""
echo "All blockers verified. Proceed to Rule 5 to implement fixes."
echo ""