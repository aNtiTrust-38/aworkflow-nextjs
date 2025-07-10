import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import WorkflowUI from '../src/app/WorkflowUI';

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(mockMatchMedia),
  });
});

afterEach(() => {
  cleanup();
});

describe('Responsive Design', () => {
  it('should render mobile-friendly stepper on small screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone SE width
    });
    
    window.matchMedia = vi.fn().mockImplementation(query => ({
      ...mockMatchMedia(query),
      matches: query.includes('max-width: 768px'),
    }));

    render(<WorkflowUI />);
    
    // Should show mobile stepper (dropdown instead of horizontal buttons)
    expect(screen.getByTestId('mobile-stepper')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-stepper')).not.toBeInTheDocument();
    
    // Mobile stepper should be a select dropdown
    const mobileSelect = screen.getByTestId('mobile-step-select');
    expect(mobileSelect).toHaveRole('combobox');
    expect(mobileSelect).toHaveValue('0'); // Step 1 (0-indexed)
  });

  it('should render desktop stepper on large screens', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    window.matchMedia = vi.fn().mockImplementation(query => ({
      ...mockMatchMedia(query),
      matches: query.includes('min-width: 769px'),
    }));

    render(<WorkflowUI />);
    
    // Should show desktop stepper
    expect(screen.getByTestId('desktop-stepper')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-stepper')).not.toBeInTheDocument();
    
    // Desktop stepper should have horizontal button layout
    const stepButtons = screen.getAllByRole('tab');
    expect(stepButtons).toHaveLength(6);
  });

  it('should adapt layout for tablet screens', () => {
    // Mock tablet viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // iPad width
    });
    
    window.matchMedia = vi.fn().mockImplementation(query => ({
      ...mockMatchMedia(query),
      matches: query.includes('min-width: 768px') && query.includes('max-width: 1023px'),
    }));

    render(<WorkflowUI />);
    
    // Should show tablet layout
    const mainContent = screen.getByTestId('workflow-main');
    expect(mainContent).toHaveClass('tablet:grid-cols-2');
    
    // Stepper should be compact but still horizontal
    const stepper = screen.getByTestId('workflow-stepper');
    expect(stepper).toHaveClass('tablet:gap-1');
  });

  it('should handle orientation changes', () => {
    // Mock landscape mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 667, // iPhone landscape
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<WorkflowUI />);
    
    // Should adapt to landscape orientation
    const header = screen.getByTestId('academic-header');
    expect(header).toHaveClass('landscape:text-xl'); // Smaller header in landscape
    
    // Content should be more compact
    const workflowMain = screen.getByTestId('workflow-main');
    expect(workflowMain).toHaveClass('landscape:py-4');
  });

  it('should support touch-friendly interactions on mobile', () => {
    // Mock mobile with touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
      writable: true,
    });

    // Mock desktop viewport to ensure desktop stepper is shown
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<WorkflowUI />);
    
    // Touch targets should be at least 44px on tab buttons
    const stepButtons = screen.getAllByRole('tab');
    stepButtons.forEach(button => {
      expect(button).toHaveClass('touch:min-h-11', 'touch:min-w-11');
      expect(button).toHaveClass('touch:py-3', 'touch:px-6');
    });
  });

  it('should adapt text sizes for different screen sizes', () => {
    // Test that the section title has responsive text classes
    render(<WorkflowUI />);
    
    const sectionTitle = screen.getByTestId('section-title');
    // The actual implementation uses 'text-lg md:text-xl' classes
    expect(sectionTitle).toHaveClass('text-lg');
    expect(sectionTitle).toHaveClass('md:text-xl');
  });

  it('should handle container queries for component-level responsiveness', () => {
    render(<WorkflowUI />);
    
    // Mock container size change
    const workflowMain = screen.getByTestId('workflow-main');
    
    // Should have container query classes
    expect(workflowMain).toHaveClass('@container');
    
    // Child elements should respond to container size
    const stepContent = screen.getByTestId('step-content-area');
    expect(stepContent).toHaveClass('@lg:grid-cols-2');
  });

  it('should provide responsive navigation for mobile', () => {
    // Mock mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375,
    });

    render(<WorkflowUI />);
    
    // Should show mobile navigation
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    
    // Previous/Next should be touch-friendly
    const navButtons = screen.getAllByRole('button', { name: /(previous|next)/i });
    navButtons.forEach(button => {
      expect(button).toHaveClass('mobile:w-full', 'mobile:py-4');
    });
  });

  it('should adapt form layouts for mobile', () => {
    render(<WorkflowUI />);
    
    // Form elements should stack on mobile
    const promptInput = screen.getByLabelText(/assignment prompt/i);
    expect(promptInput).toHaveClass('mobile:w-full');
    
    // Labels should be above inputs on mobile
    const label = screen.getByText(/assignment prompt/i);
    expect(label).toHaveClass('mobile:block', 'mobile:mb-2');
  });

  it('should handle viewport height changes', () => {
    // Mock short viewport (landscape mobile)
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 400,
    });

    render(<WorkflowUI />);
    
    // Should adapt to short viewport
    const header = screen.getByTestId('academic-header');
    expect(header).toHaveClass('short:text-lg', 'short:mb-2');
    
    // Content should be more compact
    const workflowMain = screen.getByTestId('workflow-main');
    expect(workflowMain).toHaveClass('short:py-2');
  });

  it('should provide responsive grid layouts', () => {
    render(<WorkflowUI />);
    
    const contentGrid = screen.getByTestId('content-grid');
    
    // Should have responsive grid classes
    expect(contentGrid).toHaveClass(
      'grid',
      'grid-cols-1',
      'md:grid-cols-2',
      'lg:grid-cols-3',
      'xl:grid-cols-4'
    );
    
    // Grid items should have responsive spacing
    const gridItems = screen.getAllByTestId(/grid-item/);
    gridItems.forEach(item => {
      expect(item).toHaveClass('p-2', 'md:p-4', 'lg:p-6');
    });
  });

  it('should handle responsive images and media', () => {
    render(<WorkflowUI />);
    
    // Images should be responsive
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveClass('w-full', 'h-auto', 'max-w-full');
    });
    
    // Should have responsive loading
    expect(images[0]).toHaveAttribute('loading', 'lazy');
  });

  it('should adapt spacing and margins responsively', () => {
    render(<WorkflowUI />);
    
    // Test the section title wrapper which has responsive padding/margins
    const sectionTitleWrapper = screen.getByTestId('section-title-wrapper');
    expect(sectionTitleWrapper).toHaveClass('p-2', 'md:p-4', 'lg:p-6');
    expect(sectionTitleWrapper).toHaveClass('mb-4', 'md:mb-6', 'lg:mb-8');
    
    // Test actual sections that exist in the component
    const section1 = screen.getByTestId('section-1');
    expect(section1).toHaveClass('mb-4', 'md:mb-6', 'lg:mb-8');
    expect(section1).toHaveClass('p-2', 'md:p-4', 'lg:p-6');
    
    const section2 = screen.getByTestId('section-2');
    expect(section2).toHaveClass('mb-4', 'md:mb-6', 'lg:mb-8');
    expect(section2).toHaveClass('p-2', 'md:p-4', 'lg:p-6');
  });

  it('should handle responsive font scaling', () => {
    render(<WorkflowUI />);
    
    // Headings should scale responsively
    const heading = screen.getByTestId('academic-header');
    expect(heading).toHaveClass('text-xl', 'md:text-2xl', 'lg:text-3xl');
    
    // Body text should be readable on all sizes
    const bodyText = screen.getAllByTestId(/body-text/);
    bodyText.forEach(text => {
      expect(text).toHaveClass('text-sm', 'md:text-base', 'lg:text-lg');
    });
  });

  it('should provide responsive modal and overlay layouts', () => {
    render(<WorkflowUI />);
    
    // Trigger modal (error state)
    const mockError = new Error('Test error');
    fireEvent(window, new CustomEvent('error', { detail: mockError }));
    
    const modal = screen.getByTestId('error-modal');
    
    // Modal should be responsive
    expect(modal).toHaveClass(
      'w-full',
      'max-w-md',
      'mx-4',
      'md:max-w-lg',
      'lg:max-w-xl'
    );
  });

  it('should handle responsive sidebar and navigation', () => {
    render(<WorkflowUI />);
    
    // Sidebar should be hidden on mobile, visible on desktop
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveClass('hidden', 'lg:block', 'lg:w-64');
    
    // Mobile menu toggle should be visible on mobile
    const mobileMenuToggle = screen.getByTestId('mobile-menu-toggle');
    expect(mobileMenuToggle).toHaveClass('block', 'lg:hidden');
  });

  it('should render a multi-panel grid layout on desktop screens', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1400,
    });
    window.matchMedia = vi.fn().mockImplementation(query => ({
      ...mockMatchMedia(query),
      matches: query.includes('min-width: 1200px'),
    }));

    render(<WorkflowUI />);

    // Should show workflow container with multi-panel grid
    const container = screen.getByTestId('workflow-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('workflow-container');
    // Should have 3 columns: left, main, right
    // (You may need to check for grid-template-columns or class names)
    // For now, check for grid and column classes
    expect(container).toHaveClass('grid');
    // Optionally, check for left, main, right panel children
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByTestId('main-panel')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
  });
});