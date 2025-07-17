import { describe, it, expect } from 'vitest'

/**
 * RULE 4: Minimal test to demonstrate timeout issue
 * 
 * This is the simplest possible test that should run in milliseconds
 * but will timeout due to infrastructure issues.
 */

describe('Minimal Timeout Demo', () => {
  it('should complete a simple math operation', () => {
    // This test should take <1ms
    expect(2 + 2).toBe(4)
  })

  it('should verify basic string operations', () => {
    // Another simple test
    const greeting = 'Hello, World!'
    expect(greeting).toContain('Hello')
    expect(greeting.length).toBe(13)
  })

  it('should handle basic array operations', () => {
    // Yet another simple test
    const numbers = [1, 2, 3, 4, 5]
    expect(numbers).toHaveLength(5)
    expect(numbers[0]).toBe(1)
    expect(numbers[4]).toBe(5)
  })
})

// This entire test file should execute in under 100ms
// But due to test collection issues, it will timeout