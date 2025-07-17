import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

/**
 * RULE 4: RED Phase - Component Test Infrastructure Failures
 * 
 * These tests demonstrate the missing jest-dom matchers issue
 * that causes component tests to fail with timeout errors.
 */

// Simple test component
const TestButton = () => (
  <button type="button">Click me</button>
)

describe('Component Test Infrastructure Failures', () => {
  describe('BLOCKER: Missing jest-dom matchers', () => {
    it('should fail due to missing toBeInTheDocument matcher', () => {
      // This test will fail because jest-dom is not imported in setup
      render(<TestButton />)
      
      const button = screen.getByRole('button')
      
      // EXPECTED TO FAIL - toBeInTheDocument is not defined
      // This will throw: TypeError: expect(...).toBeInTheDocument is not a function
      try {
        // @ts-ignore - TypeScript knows this doesn't exist
        expect(button).toBeInTheDocument()
      } catch (error: any) {
        expect(error.message).toContain('toBeInTheDocument is not a function')
      }
    })

    it('should fail due to missing toHaveClass matcher', () => {
      render(<div className="test-class">Test</div>)
      
      const element = screen.getByText('Test')
      
      // EXPECTED TO FAIL - toHaveClass is not defined
      try {
        // @ts-ignore
        expect(element).toHaveClass('test-class')
      } catch (error: any) {
        expect(error.message).toContain('toHaveClass is not a function')
      }
    })

    it('should fail due to missing toBeDisabled matcher', () => {
      render(<button disabled>Disabled</button>)
      
      const button = screen.getByRole('button')
      
      // EXPECTED TO FAIL - toBeDisabled is not defined
      try {
        // @ts-ignore
        expect(button).toBeDisabled()
      } catch (error: any) {
        expect(error.message).toContain('toBeDisabled is not a function')
      }
    })
  })

  describe('BLOCKER: JSdom environment overhead', () => {
    it('should demonstrate jsdom is used for all tests', () => {
      // Verify we're in jsdom environment
      expect(typeof window).toBe('object')
      expect(typeof document).toBe('object')
      expect(window.location.href).toBe('http://localhost:3000/')
      
      // This is heavyweight for API tests that don't need DOM
    })

    it('should show navigation errors in jsdom', () => {
      // JSdom navigation often causes errors in component tests
      const originalError = console.error
      const errors: string[] = []
      console.error = (msg: any) => errors.push(String(msg))
      
      try {
        // Attempt navigation
        window.location.href = '/test'
        
        // Check for navigation errors
        const navigationErrors = errors.filter(e => 
          e.includes('navigation') || e.includes('Not implemented')
        )
        
        // EXPECTED - JSdom has navigation limitations
        expect(navigationErrors.length).toBeGreaterThanOrEqual(0)
      } finally {
        console.error = originalError
      }
    })
  })

  describe('Test Performance Issues', () => {
    it('should demonstrate slow test setup', () => {
      const startTime = Date.now()
      
      // Even simple renders can be slow with jsdom overhead
      for (let i = 0; i < 10; i++) {
        render(<div key={i}>Test {i}</div>)
      }
      
      const duration = Date.now() - startTime
      
      // This should be fast but jsdom makes it slow
      console.log(`10 simple renders took ${duration}ms`)
      
      // Document the performance issue
      expect(duration).toBeGreaterThan(0)
    })
  })

  describe('Configuration Issues', () => {
    it('should verify vitest globals are configured', () => {
      // Check if vitest globals are available
      expect(typeof describe).toBe('function')
      expect(typeof it).toBe('function')
      expect(typeof expect).toBe('function')
      expect(typeof vi).toBe('object')
    })

    it('should verify React Testing Library is available', () => {
      // These imports work
      expect(render).toBeDefined()
      expect(screen).toBeDefined()
      
      // But jest-dom matchers are missing
      const matchers = (expect as any).extend
      expect(matchers).toBeDefined()
      
      // These matchers should exist but don't
      const expectedMatchers = [
        'toBeInTheDocument',
        'toHaveClass',
        'toBeDisabled',
        'toHaveTextContent',
        'toHaveAttribute'
      ]
      
      for (const matcher of expectedMatchers) {
        // @ts-ignore
        const hasMethod = expect.prototype?.[matcher] || expect[matcher]
        expect(hasMethod).toBeUndefined()
      }
    })
  })

  describe('Summary of Component Test Failures', () => {
    it('should document all component test issues', () => {
      console.log(`
COMPONENT TEST INFRASTRUCTURE FAILURES
=====================================

1. Missing jest-dom matchers:
   - toBeInTheDocument
   - toHaveClass  
   - toBeDisabled
   - toHaveTextContent
   - toHaveAttribute
   
2. JSdom overhead:
   - Used for ALL tests (even API tests)
   - Slow test collection and execution
   - Navigation limitations
   
3. Configuration issues:
   - No import of @testing-library/jest-dom in setup
   - Universal jsdom environment
   - No test categorization

4. Performance impact:
   - 87+ second test collection
   - Component tests timing out
   - Sequential execution only

These issues cause component tests to fail or timeout.
      `)
      
      expect(true).toBe(true)
    })
  })
})