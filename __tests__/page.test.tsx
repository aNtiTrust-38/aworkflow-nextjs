import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../src/app/page';

// Failing test: prompt input, file upload, and submit button should be present

describe('Landing Page UI', () => {
  it('renders prompt input, file upload, and submit button', () => {
    render(<Home />);
    // Prompt input (textarea)
    expect(screen.getByLabelText(/assignment prompt/i)).toBeInTheDocument();
    // File upload (rubric/sample)
    expect(screen.getByLabelText(/upload files/i)).toBeInTheDocument();
    // Submit button
    expect(screen.getByRole('button', { name: /generate outline/i })).toBeInTheDocument();
  });
}); 