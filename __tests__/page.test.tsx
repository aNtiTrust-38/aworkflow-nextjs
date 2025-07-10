import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../src/app/page';

// Failing test: prompt input, file upload, and submit button should be present

describe('Landing Page UI', () => {
  // Remove legacy form test
  // it('renders prompt input, file upload, and submit button', () => {
  //   render(<Home />);
  //   expect(screen.getByLabelText(/assignment prompt/i)).toBeInTheDocument();
  //   expect(screen.getByLabelText(/upload files/i)).toBeInTheDocument();
  //   expect(screen.getByRole('button', { name: /generate outline/i })).toBeInTheDocument();
  // });

  // RED PHASE: Failing test for WorkflowUI integration
  it('renders the WorkflowUI stepper on the main page', () => {
    render(<Home />);
    // Allow for multiple renders in strict mode/dev
    const steppers = screen.getAllByTestId('workflow-stepper');
    expect(steppers.length).toBeGreaterThan(0);
  });
}); 