import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Navigation from './Navigation';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
}));

describe('Navigation', () => {
  it('renders a Settings link with proper ARIA label and active state', () => {
    render(<Navigation />);
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(settingsLink).toHaveAttribute('aria-label', 'Settings');
    expect(settingsLink).toHaveAttribute('aria-current', 'page');
  });

  it('allows keyboard navigation to the Settings link', async () => {
    render(<Navigation />);
    await userEvent.tab();
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toHaveFocus();
  });
}); 