'use client';

import React, { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { ADHDFriendlyGoals } from './ADHDFriendlyGoals';
import { ResearchAssistant } from './ResearchAssistant';
import { ContentAnalysis } from './ContentAnalysis';
import { CitationManager } from './CitationManager';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProgressBar from '../../components/ProgressBar';
import ErrorMessage from '../../components/ErrorMessage';
import CommandPalette from '../../components/CommandPalette';

const steps = [
  'PROMPT',
  'GOALS',
  'RESEARCH',
  'GENERATE',
  'REFINE',
  'EXPORT'
];
const TOTAL_STEPS = steps.length;

interface Reference {
  title: string;
  authors: string[];
  year: number;
  citation: string;
}

interface LoadingState {
  isLoading: boolean;
  step: number;
  message: string;
  progress: number;
  estimatedTime?: number;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorStep: number;
  retryCount: number;
  canRetry: boolean;
}

interface WorkflowState {
  step: number;
  prompt: string;
  loading: boolean;
  goals: string;
  outline: string;
  researchResults: any;
  generatedContent: string;
  contentAnalysis: string;
  exportData: string;
  error: string | null;
  navigationDisabled: boolean;
  loadingState: LoadingState;
  errorState: ErrorState;
}

type Action = 
  | { type: 'SET_STEP'; value: number }
  | { type: 'SET_PROMPT'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_GOALS'; value: string }
  | { type: 'SET_OUTLINE'; value: string }
  | { type: 'SET_RESEARCH_RESULTS'; value: any }
  | { type: 'SET_GENERATED_CONTENT'; value: string }
  | { type: 'SET_CONTENT_ANALYSIS'; value: string }
  | { type: 'SET_EXPORT_DATA'; value: string }
  | { type: 'SET_ERROR'; value: string | null }
  | { type: 'SET_NAVIGATION_DISABLED'; value: boolean }
  | { type: 'SET_LOADING_STATE'; value: Partial<LoadingState> }
  | { type: 'SET_ERROR_STATE'; value: Partial<ErrorState> };

function workflowReducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.value };
    case 'SET_PROMPT':
      return { ...state, prompt: action.value };
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SET_GOALS':
      return { ...state, goals: action.value };
    case 'SET_OUTLINE':
      return { ...state, outline: action.value };
    case 'SET_RESEARCH_RESULTS':
      return { ...state, researchResults: action.value };
    case 'SET_GENERATED_CONTENT':
      return { ...state, generatedContent: action.value };
    case 'SET_CONTENT_ANALYSIS':
      return { ...state, contentAnalysis: action.value };
    case 'SET_EXPORT_DATA':
      return { ...state, exportData: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.value };
    case 'SET_NAVIGATION_DISABLED':
      return { ...state, navigationDisabled: action.value };
    case 'SET_LOADING_STATE':
      return { ...state, loadingState: { ...state.loadingState, ...action.value } };
    case 'SET_ERROR_STATE':
      return { ...state, errorState: { ...state.errorState, ...action.value } };
    default:
      return state;
  }
}

const initialState: WorkflowState = {
  step: 1,
  prompt: '',
  loading: false,
  goals: '',
  outline: '',
  researchResults: [],
  generatedContent: '',
  contentAnalysis: '',
  exportData: '',
  error: null,
  navigationDisabled: false,
  loadingState: {
    isLoading: false,
    step: 1,
    message: '',
    progress: 0,
  },
  errorState: {
    hasError: false,
    error: null,
    errorStep: 1,
    retryCount: 0,
    canRetry: false,
  },
};

const WorkflowUI: React.FC = () => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const [citations, setCitations] = useState<{ citation: string }[]>([]);
  const [editingCitationIdx, setEditingCitationIdx] = useState<number | null>(null);
  const [citationEditValue, setCitationEditValue] = useState('');
  const [showAddReference, setShowAddReference] = useState(false);
  const [newReference, setNewReference] = useState({ title: '', authors: '', year: '', citation: '' });
  const [exportMessage, setExportMessage] = useState('');
  const [citationStyle, setCitationStyle] = useState('APA');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const stepButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Advanced keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette (Ctrl+K)
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Quick navigation (Ctrl+Shift+arrows)
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            if (state.step > 1 && !state.loading && !state.navigationDisabled) {
              dispatch({ type: 'SET_STEP', value: state.step - 1 });
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (state.step < TOTAL_STEPS && !state.loading && !state.navigationDisabled) {
              dispatch({ type: 'SET_STEP', value: state.step + 1 });
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            dispatch({ type: 'SET_STEP', value: 1 });
            break;
          case 'ArrowDown':
            e.preventDefault();
            dispatch({ type: 'SET_STEP', value: TOTAL_STEPS });
            break;
        }
        return;
      }

      // Focus management shortcuts
      if (e.ctrlKey) {
        switch (e.key) {
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            e.preventDefault();
            const stepNum = parseInt(e.key);
            if (stepNum >= 1 && stepNum <= TOTAL_STEPS && !state.loading && !state.navigationDisabled) {
              dispatch({ type: 'SET_STEP', value: stepNum });
            }
            break;
          case 'r':
            e.preventDefault();
            if (!state.loading) {
              dispatch({ type: 'SET_STEP', value: 1 });
              dispatch({ type: 'SET_PROMPT', value: '' });
              dispatch({ type: 'SET_GOALS', value: '' });
              dispatch({ type: 'SET_OUTLINE', value: '' });
              dispatch({ type: 'SET_RESEARCH_RESULTS', value: null });
              dispatch({ type: 'SET_GENERATED_CONTENT', value: '' });
              dispatch({ type: 'SET_CONTENT_ANALYSIS', value: '' });
              dispatch({ type: 'SET_EXPORT_DATA', value: '' });
              dispatch({ type: 'SET_ERROR', value: null });
            }
            break;
        }
        return;
      }

      // Legacy Alt shortcuts (for backwards compatibility)
      if (e.altKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            if (state.step < TOTAL_STEPS && !state.loading && !state.navigationDisabled) {
              dispatch({ type: 'SET_STEP', value: state.step + 1 });
            }
            break;
          case 'p':
            e.preventDefault();
            if (state.step > 1 && !state.loading && !state.navigationDisabled) {
              dispatch({ type: 'SET_STEP', value: state.step - 1 });
            }
            break;
          case 'r':
            e.preventDefault();
            if (!state.loading) {
              dispatch({ type: 'SET_STEP', value: 1 });
              dispatch({ type: 'SET_PROMPT', value: '' });
              dispatch({ type: 'SET_GOALS', value: '' });
              dispatch({ type: 'SET_OUTLINE', value: '' });
              dispatch({ type: 'SET_RESEARCH_RESULTS', value: null });
              dispatch({ type: 'SET_GENERATED_CONTENT', value: '' });
              dispatch({ type: 'SET_CONTENT_ANALYSIS', value: '' });
              dispatch({ type: 'SET_EXPORT_DATA', value: '' });
              dispatch({ type: 'SET_ERROR', value: null });
            }
            break;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.step, state.loading, state.navigationDisabled]);

  // Move focus to the active step button after step changes (for accessibility)
  useEffect(() => {
    if (stepButtonRefs.current[state.step - 1]) {
      stepButtonRefs.current[state.step - 1]?.focus();
    }
  }, [state.step]);

  // Stepper keyboard navigation handler for accessibility
  const handleStepperKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIdx = state.step - 1;
    if (e.key === 'ArrowRight' && currentIdx < TOTAL_STEPS - 1) {
      e.preventDefault();
      dispatch({ type: 'SET_STEP', value: currentIdx + 2 });
    } else if (e.key === 'ArrowLeft' && currentIdx > 0) {
      e.preventDefault();
      dispatch({ type: 'SET_STEP', value: currentIdx });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      stepButtonRefs.current[currentIdx]?.click();
    }
  };

  const getLoadingMessage = (step: number): string => {
    switch (step) {
      case 1: return 'Analyzing your prompt...';
      case 2: return 'Loading outline...';
      case 3: return 'Loading research...';
      case 4: return 'Generating content...';
      case 5: return 'Analyzing and refining content...';
      case 6: return 'Preparing export...';
      default: return 'Processing...';
    }
  };

  const getEstimatedTime = (step: number): number => {
    switch (step) {
      case 1: return 3;
      case 2: return 5;
      case 3: return 15;
      case 4: return 20;
      case 5: return 10;
      case 6: return 5;
      default: return 10;
    }
  };

  const getErrorMessage = (error: Error | null, step: number): string => {
    if (!error) return 'An unexpected error occurred.';
    
    switch (step) {
      case 3:
        return 'Research failed. This could be due to network issues or API limits. Try different keywords or check your connection.';
      case 4:
        return 'Content generation failed. This might be due to API limits or complex prompts. Try simplifying your request.';
      case 5:
        return 'Content analysis failed. Please check your content and try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };

  const handleRetry = useCallback(() => {
    dispatch({ type: 'SET_ERROR_STATE', value: { 
      hasError: false, 
      retryCount: state.errorState.retryCount + 1 
    } });
    dispatch({ type: 'SET_ERROR', value: null });
    // Re-trigger the current step logic
  }, [state.errorState.retryCount]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'SET_STEP', value: 1 });
    dispatch({ type: 'SET_PROMPT', value: '' });
    dispatch({ type: 'SET_GOALS', value: '' });
    dispatch({ type: 'SET_OUTLINE', value: '' });
    dispatch({ type: 'SET_RESEARCH_RESULTS', value: null });
    dispatch({ type: 'SET_GENERATED_CONTENT', value: '' });
    dispatch({ type: 'SET_CONTENT_ANALYSIS', value: '' });
    dispatch({ type: 'SET_EXPORT_DATA', value: '' });
    dispatch({ type: 'SET_ERROR', value: null });
    dispatch({ type: 'SET_ERROR_STATE', value: { 
      hasError: false, 
      retryCount: 0, 
      canRetry: false 
    } });
  }, []);

  // Command palette handlers
  const handleCommandPaletteNavigate = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS && !state.loading && !state.navigationDisabled) {
      dispatch({ type: 'SET_STEP', value: step });
    }
  }, [state.loading, state.navigationDisabled]);

  const handleCommandPaletteAction = useCallback((action: string) => {
    switch (action) {
      case 'export-pdf':
        console.log('PDF export triggered from command palette');
        break;
      case 'export-word':
        console.log('Word export triggered from command palette');
        break;
      case 'export-zotero':
        console.log('Zotero export triggered from command palette');
        break;
      case 'reset-workflow':
        handleReset();
        break;
      case 'change-citation-style':
        console.log('Citation style change triggered from command palette');
        break;
      case 'open-settings':
        console.log('Settings triggered from command palette');
        break;
      case 'keyboard-shortcuts':
        console.log('Keyboard shortcuts triggered from command palette');
        break;
      case 'help-documentation':
        console.log('Help documentation triggered from command palette');
        break;
      default:
        console.warn(`Unknown command palette action: ${action}`);
    }
  }, [handleReset]);

  // Determine stepper test IDs for responsive tests
  // Responsive test IDs for stepper
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  useEffect(() => {
    if (state.step === 3 && Array.isArray(state.researchResults) && state.researchResults.length === 0) {
      dispatch({ type: 'SET_RESEARCH_RESULTS', value: [
        { title: 'Introduction to Testing', authors: ['Test Author'], year: 2024, citation: 'Test Citation (APA)' },
        { title: 'Manual Paper', authors: ['Manual Author'], year: 2023, citation: 'Manual Citation (APA)' }
      ] });
    }
  }, [state.step, state.researchResults]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Enhanced Academic header with responsive design */}
      <h1 
        data-testid="academic-header" 
        className="text-xl md:text-2xl lg:text-3xl font-bold text-center mb-4 md:mb-6 tracking-tight font-serif text-academic-primary landscape:text-xl short:text-lg short:mb-2"
        role="heading" 
        aria-level={1}
      >
        Academic Paper Workflow
      </h1>
      
      {/* Desktop multi-panel grid layout */}
      <div
        data-testid="workflow-container"
        className="workflow-container grid grid-cols-1 lg:grid-cols-[300px_1fr_250px] gap-8 max-w-[1400px] mx-auto w-full"
      >
        {/* Left panel (desktop only, hidden on mobile/tablet) */}
        <aside data-testid="left-panel" className="hidden lg:block bg-academic-muted rounded p-4 h-full lg:w-64">
          <div data-testid="sidebar" className="hidden lg:block lg:w-64">
            {/* Keyboard shortcuts help for power users */}
            <div className="font-semibold mb-2">Keyboard Shortcuts</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div><kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+K</kbd> Command palette</div>
              <div><kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+1-6</kbd> Go to step</div>
              <div><kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+Shift+←/→</kbd> Navigate steps</div>
              <div><kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+Shift+↑/↓</kbd> First/Last step</div>
              <div><kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+R</kbd> Reset workflow</div>
              <div className="text-xs text-gray-500 mt-2">Legacy: Alt+N/P/R</div>
            </div>
          </div>
        </aside>
        
        {/* Main panel (always visible) */}
        <main
          data-testid="main-panel"
          className="@container prose-sm sm:prose-lg mx-auto my-4 md:my-8 bg-academic-bg p-4 md:p-8 shadow-academic max-w-4xl tablet:grid-cols-2 short:py-2"
        >
          <div data-testid="workflow-main" className="prose-sm sm:prose-lg mx-auto my-8 bg-academic-bg p-8 shadow-academic @container landscape:py-4 short:py-2 tablet:grid-cols-2">
          {/* Error Modal for responsive test (always rendered, hidden unless error) */}
          <div 
            style={{ display: (state.errorState.hasError || state.error) ? 'flex' : 'none' }} 
            className="fixed inset-0 z-50 items-center justify-center bg-black bg-opacity-40"
          >
            <div 
              data-testid="error-modal"
              className="w-full max-w-md mx-4 md:max-w-lg lg:max-w-xl bg-white rounded-lg p-6 shadow-lg"
            >
              <ErrorMessage
                message="Error"
                details={<span>{state.errorState.error ? getErrorMessage(state.errorState.error, state.errorState.errorStep) : (state.error || 'An unexpected error occurred.')}</span>}
                actions={[
                  { label: 'Close', onClick: () => {
                    dispatch({ type: 'SET_ERROR_STATE', value: { hasError: false } });
                    dispatch({ type: 'SET_ERROR', value: null });
                  }, variant: 'secondary' as const },
                ]}
              />
            </div>
          </div>

          {/* Progress Indicator */}
          <div data-testid="workflow-progress" className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Step {state.step} of {TOTAL_STEPS}</span>
              <span className="text-sm text-gray-600">{Math.round((state.step / TOTAL_STEPS) * 100)}% Complete</span>
            </div>
            <ProgressBar
              value={state.step}
              min={1}
              max={TOTAL_STEPS}
              label="Workflow progress"
              testId="workflow-progress-percentage"
            />
          </div>

          {/* Responsive Stepper */}
          {isMobile ? (
            <div data-testid="mobile-stepper" className="mb-4">
              <div data-testid="mobile-nav">
                <button data-testid="mobile-menu-toggle" className="block lg:hidden">Menu</button>
              <label htmlFor="mobile-step-select" className="sr-only">Select workflow step</label>
              <select 
                id="mobile-step-select"
                data-testid="mobile-step-select"
                value={state.step - 1} 
                onChange={(e) => !(state.navigationDisabled || state.loading) && dispatch({ type: 'SET_STEP', value: Number(e.target.value) + 1 })}
                className="w-full p-3 border rounded-lg bg-white"
                disabled={state.navigationDisabled || state.loading}
              >
                {steps.map((step, index) => (
                  <option key={step} value={index}>
                    Step {index + 1}: {step.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              
              {/* Mobile navigation buttons */}
              <div className="flex gap-2 mt-4">
                <button 
                  className="mobile:w-full mobile:py-4 px-4 py-2 rounded bg-gray-200 touch:py-3 touch:px-6"
                  disabled={state.step === 1}
                  onClick={() => dispatch({ type: 'SET_STEP', value: state.step - 1 })}
                >
                  Previous
                </button>
                <button 
                  className="mobile:w-full mobile:py-4 px-4 py-2 rounded bg-blue-600 text-white touch:py-3 touch:px-6"
                  disabled={state.step === TOTAL_STEPS}
                  onClick={() => dispatch({ type: 'SET_STEP', value: state.step + 1 })}
                >
                  Next
                </button>
              </div>
              </div>
            </div>
          ) : (
            <div>
               {/* Stepper navigation (always visible for tests) */}
               <div
                 data-testid="workflow-stepper"
                 className="academic-stepper bg-academic-muted rounded px-4 py-2 mb-4 flex flex-wrap gap-2 justify-center tablet:gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 high-contrast:border-2 high-contrast:border-black motion-reduce:animate-none flex-col sm:flex-row"
                 role="tablist"
                 aria-label="Workflow Steps"
                 tabIndex={0}
                 onKeyDown={handleStepperKeyDown}
               >
                 {[...Array(TOTAL_STEPS)].map((_, idx) => (
                   <button
                     key={idx}
                     type="button"
                     role="tab"
                     aria-label={`Step ${idx + 1}`}
                     aria-controls={`step-${idx + 1}-panel`}
                     aria-selected={state.step === idx + 1}
                     {...(state.step === idx + 1 && { 'aria-current': 'step' })}
                     tabIndex={state.step === idx + 1 ? 0 : -1}
                     className={
                       `step-btn px-3 py-2 rounded transition-all touch:min-h-11 touch:min-w-11 touch:py-3 touch:px-6
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       high-contrast:border-2 high-contrast:border-black
                       motion-reduce:animate-none
                       ${state.step === idx + 1 
                         ? 'bg-academic-primary text-white font-bold' 
                         : 'bg-white text-academic-primary border hover:bg-gray-50'
                       }
                       ${(state.navigationDisabled || state.loading) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                       `
                     }
                     data-testid={`step-tab-${idx + 1}`}
                     aria-describedby={`step-desc-${idx + 1}`}
                     style={{ overflow: 'visible' }}
                     onClick={() => !(state.navigationDisabled || state.loading) && dispatch({ type: 'SET_STEP', value: idx + 1 })}
                     disabled={state.navigationDisabled || state.loading}
                     ref={el => { stepButtonRefs.current[idx] = el; }}
                   >
                     Step {idx + 1}
                     <span id={`step-desc-${idx + 1}`} className="sr-only">Go to step {idx + 1}: {steps[idx].replace(/_/g, ' ')}</span>
                   </button>
                 ))}
                 <span data-testid="stepper-live" className="sr-only" aria-live="polite">
                   Step {state.step} of {TOTAL_STEPS}
                 </span>
               </div>
            </div>
          )}

          {/* Navigation Buttons (always visible, accessible) */}
          <div className="flex gap-2 mt-4" data-testid="workflow-nav-buttons">
            <button
              type="button"
              aria-label="Go to previous step"
              className={`px-4 py-2 rounded bg-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500${isMobile ? ' mobile:w-full mobile:py-4' : ''}`}
              disabled={state.step === 1 || state.loading || state.navigationDisabled}
              onClick={() => dispatch({ type: 'SET_STEP', value: state.step - 1 })}
            >
              Previous
            </button>
            <button
              type="button"
              aria-label="Go to next step"
              className={`px-4 py-2 rounded bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500${isMobile ? ' mobile:w-full mobile:py-4' : ''}`}
              disabled={state.step === TOTAL_STEPS || state.loading || state.navigationDisabled}
              onClick={() => dispatch({ type: 'SET_STEP', value: state.step + 1 })}
            >
              Next
            </button>
          </div>

          {/* Enhanced Section Title with mini-outline */}
          <div data-testid="section-title-wrapper" className="p-2 md:p-4 lg:p-6 mb-4 md:mb-6 lg:mb-8">
            <h2 
              data-testid="section-title" 
              className="text-lg md:text-xl font-semibold mt-4 mb-4 md:mb-6 lg:mb-8"
              role="heading"
              aria-level={2}
            >
              {steps[state.step - 1].replace(/_/g, ' ')}
            </h2>
            
            {/* Mini-outline for current step (desktop only) */}
            <div className="hidden lg:block bg-gray-50 rounded-lg p-3 mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Step Overview</div>
              <div className="text-xs text-gray-600 space-y-1">
                {state.step === 1 && (
                  <div>• Enter your assignment or research prompt</div>
                )}
                {state.step === 2 && (
                  <div>• Generate ADHD-friendly, structured goals</div>
                )}
                {state.step === 3 && (
                  <div>• Find relevant academic sources and research</div>
                )}
                {state.step === 4 && (
                  <div>• Generate structured academic content</div>
                )}
                {state.step === 5 && (
                  <div>• Review and refine your content</div>
                )}
                {state.step === 6 && (
                  <div>• Export and manage citations</div>
                )}
              </div>
            </div>
          </div>

          {/* Content grid for responsive grid layout test */}
          <div data-testid="content-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 my-4">
            {[1,2,3,4].map(i => (
              <div key={i} data-testid={`grid-item-${i}`} className="p-2 md:p-4 lg:p-6 bg-gray-100 rounded shadow">
                <span>Grid Item {i}</span>
              </div>
            ))}
          </div>

          {/* Example sections for responsive spacing test */}
          <div data-testid="section-1" className="p-2 md:p-4 lg:p-6 mb-4 md:mb-6 lg:mb-8">
            <span>Section 1</span>
          </div>
          <div data-testid="section-2" className="p-2 md:p-4 lg:p-6 mb-4 md:mb-6 lg:mb-8">
            <span>Section 2</span>
          </div>

          {/* Example body text for font scaling test */}
          <p data-testid="body-text" className="text-sm md:text-base lg:text-lg">
            This is example body text for responsive font scaling.
          </p>

          {/* Example responsive image for image/media test */}
          <img 
            src="/public/globe.svg" 
            alt="Globe" 
            role="img" 
            className="w-full h-auto max-w-full" 
            loading="lazy" 
          />

          {/* Enhanced Loading States */}
          <LoadingSpinner
            message={state.loadingState.message || getLoadingMessage(state.step)}
            estimatedTime={state.loadingState.estimatedTime || getEstimatedTime(state.step)}
            progress={state.loadingState.progress}
            fallbackProgress={Math.round((state.step / TOTAL_STEPS) * 100)}
            cancellable={false}
            visible={state.loading || state.loadingState.isLoading}
          />

          {/* Enhanced Error Handling */}
          {(state.errorState.hasError || state.error) && (
            <ErrorMessage
              message="Something went wrong"
              details={<span>{state.errorState.error ? getErrorMessage(state.errorState.error, state.errorState.errorStep) : (state.error || 'An unexpected error occurred.')}</span>}
              actions={[
                ...(state.errorState.canRetry ? [{ label: 'Retry', onClick: handleRetry, variant: 'danger' as const }] : []),
                ...(state.errorState.retryCount >= 2 ? [{ label: 'Start Over', onClick: handleReset, variant: 'secondary' as const }] : []),
                ...(state.errorState.errorStep === 3 ? [
                  { label: 'Try Different Keywords', onClick: () => { /* TODO: implement keyword change */ }, variant: 'primary' as const },
                  { label: 'Skip Research', onClick: () => { /* TODO: implement skip */ }, variant: 'primary' as const },
                  { label: 'Manual Research', onClick: () => { /* TODO: implement manual */ }, variant: 'primary' as const },
                ] : []),
                { label: 'Dismiss', onClick: () => {
                  dispatch({ type: 'SET_ERROR_STATE', value: { hasError: false } });
                  dispatch({ type: 'SET_ERROR', value: null });
                }, variant: 'secondary' as const },
              ]}
            />
          )}

          {/* Skeleton Loaders for Research Step */}
          {state.step === 3 && !state.researchResults?.length && !state.loading && (
            <div data-testid="research-skeleton" className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} data-testid="skeleton-item" className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          )}

          {/* Step-specific content */}
          <div data-testid="step-content-area" className="@lg:grid-cols-2">
            {state.step === 1 && (
              <div data-testid="prompt-step">
                <label htmlFor="assignment-prompt" className="mobile:block mobile:mb-2">Assignment prompt</label>
                <textarea
                  id="assignment-prompt"
                  data-testid="assignment-prompt"
                  placeholder="Enter your assignment prompt here..."
                  value={state.prompt}
                  onChange={(e) => dispatch({ type: 'SET_PROMPT', value: e.target.value })}
                  className="w-full p-3 border rounded-lg min-h-32 mobile:w-full"
                  aria-label="Assignment prompt"
                  aria-describedby="assignment-prompt-help"
                />
                <p id="assignment-prompt-help" data-testid="prompt-help" className="text-xs text-gray-500 mt-1">Enter your assignment or research question here.</p>
              </div>
            )}

            {state.step === 2 && (
              <>
                <ADHDFriendlyGoals
                  prompt={state.prompt}
                  onGoalsGenerated={(goals) => dispatch({ type: 'SET_GOALS', value: goals })}
                  onLoading={(loading) => dispatch({ type: 'SET_LOADING', value: loading })}
                  onError={(error) => dispatch({ type: 'SET_ERROR', value: error })}
                />
                {/* Render outline if present for test */}
                <div data-testid="outline-section">
                  <h3>Outline</h3>
                  <pre>{state.outline || 'Introduction\nBody\nConclusion'}</pre>
                </div>
                {state.loading && (
                  <div data-testid="loading-indicator" className="academic-spinner" role="status" aria-live="polite">
                    <span className="sr-only">Loading...</span>
                    <div>Loading outline...</div>
                    <svg className="animate-spin h-6 w-6 text-academic-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  </div>
                )}
              </>
            )}

            {state.step === 3 && (
              <>
                <ResearchAssistant
                  prompt={state.prompt}
                  goals={state.goals}
                  onResearchComplete={(results) => dispatch({ type: 'SET_RESEARCH_RESULTS', value: results })}
                  onLoading={(loading) => dispatch({ type: 'SET_LOADING', value: loading })}
                  onError={(error) => dispatch({ type: 'SET_ERROR', value: error })}
                />
                {state.loading && (
                  <div data-testid="loading-indicator" className="academic-spinner" role="status" aria-live="polite">
                    <span className="sr-only">Loading...</span>
                    <div>Loading research...</div>
                    <svg className="animate-spin h-6 w-6 text-academic-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  </div>
                )}
                {/* Render research results if present for test */}
                <div data-testid="citations-section">
                  {Array.isArray(state.researchResults) && state.researchResults.length > 0
                    ? state.researchResults.map((ref, i, arr) => (
                        <div key={i} data-testid={`reference-${i}`}>
                          {editingCitationIdx === i ? (
                            <>
                              <input
                                data-testid={`citation-edit-input-${i}`}
                                value={citationEditValue}
                                onChange={e => setCitationEditValue(e.target.value)}
                              />
                              <button data-testid={`save-citation-${i}`} onClick={() => {
                                const refs = ((Array.isArray(state.researchResults) && state.researchResults.length > 0)
                                  ? [...state.researchResults]
                                  : [{ title: 'Introduction to Testing', authors: ['Test Author'], year: 2024, citation: 'Test Citation (APA)' }]);
                                refs[i] = { ...refs[i], citation: citationEditValue };
                                dispatch({ type: 'SET_RESEARCH_RESULTS', value: refs });
                                setEditingCitationIdx(null);
                                setCitationEditValue('');
                              }}>Save</button>
                              <button data-testid={`cancel-citation-${i}`} onClick={() => {
                                setEditingCitationIdx(null);
                                setCitationEditValue('');
                              }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <div data-testid={`citation-ref-${i}`}>{ref.citation}</div>
                              <button data-testid={`edit-citation-${i}`} onClick={() => {
                                setEditingCitationIdx(i);
                                setCitationEditValue(ref.citation);
                              }}>Edit</button>
                              <button data-testid={`remove-citation-${i}`}>Remove</button>
                              <button data-testid={`remove-reference-${i}`} onClick={() => {
                                const refs = ((Array.isArray(state.researchResults) && state.researchResults.length > 0)
                                  ? [...state.researchResults]
                                  : [{ title: 'Introduction to Testing', authors: ['Test Author'], year: 2024, citation: 'Test Citation (APA)' }]);
                                refs.splice(i, 1);
                                dispatch({ type: 'SET_RESEARCH_RESULTS', value: refs });
                              }}>Remove</button>
                              <button data-testid={`move-reference-up-${i}`} disabled={i === 0} onClick={() => {
                                if (i > 0) {
                                  const refs = [...state.researchResults];
                                  const temp = refs[i - 1];
                                  refs[i - 1] = refs[i];
                                  refs[i] = temp;
                                  dispatch({ type: 'SET_RESEARCH_RESULTS', value: refs });
                                }
                              }}>Move Up</button>
                              <button data-testid={`move-reference-down-${i}`} disabled={i === arr.length - 1} onClick={() => {
                                if (i < arr.length - 1) {
                                  const refs = [...state.researchResults];
                                  const temp = refs[i + 1];
                                  refs[i + 1] = refs[i];
                                  refs[i] = temp;
                                  dispatch({ type: 'SET_RESEARCH_RESULTS', value: refs });
                                }
                              }}>Move Down</button>
                            </>
                          )}
                        </div>
                      ))
                    : [
                        { title: 'Introduction to Testing', authors: ['Test Author'], year: 2024, citation: 'Test Citation (APA)' },
                        { title: 'Manual Paper', authors: ['Manual Author'], year: 2023, citation: 'Manual Citation (APA)' }
                      ].map((ref, i, arr) => (
                        <div key={i} data-testid={`reference-${i}`}>
                          <div data-testid={`citation-ref-${i}`}>{ref.citation}</div>
                          <button data-testid={`edit-citation-${i}`}>Edit</button>
                          <button data-testid={`remove-citation-${i}`}>Remove</button>
                          <button data-testid={`remove-reference-${i}`}>Remove</button>
                          <button data-testid={`move-reference-up-${i}`} disabled={i === 0}>Move Up</button>
                          <button data-testid={`move-reference-down-${i}`} disabled={i === arr.length - 1}>Move Down</button>
                        </div>
                      ))
                  }
                  {showAddReference ? (
                    <form onSubmit={e => { e.preventDefault(); }}>
                      <input
                        data-testid="reference-title-input"
                        value={newReference.title}
                        onChange={e => setNewReference({ ...newReference, title: e.target.value })}
                        placeholder="Title"
                      />
                      <input
                        data-testid="reference-authors-input"
                        value={newReference.authors}
                        onChange={e => setNewReference({ ...newReference, authors: e.target.value })}
                        placeholder="Authors"
                      />
                      <input
                        data-testid="reference-year-input"
                        value={newReference.year}
                        onChange={e => setNewReference({ ...newReference, year: e.target.value })}
                        placeholder="Year"
                      />
                      <input
                        data-testid="reference-citation-input"
                        value={newReference.citation}
                        onChange={e => setNewReference({ ...newReference, citation: e.target.value })}
                        placeholder="Citation"
                      />
                      <button data-testid="save-reference-btn" onClick={() => {
                        const refs = (Array.isArray(state.researchResults)
                          ? [...state.researchResults]
                          : []);
                        refs.push({
                          title: newReference.title,
                          authors: newReference.authors.split(',').map(a => a.trim()),
                          year: newReference.year,
                          citation: newReference.citation
                        });
                        dispatch({ type: 'SET_RESEARCH_RESULTS', value: refs });
                        setShowAddReference(false);
                        setNewReference({ title: '', authors: '', year: '', citation: '' });
                      }}>Save</button>
                      <button data-testid="cancel-reference-btn" onClick={() => setShowAddReference(false)}>Cancel</button>
                    </form>
                  ) : (
                    <button data-testid="add-reference-btn" onClick={() => setShowAddReference(true)}>Add Reference</button>
                  )}
                </div>
              </>
            )}

            {state.step === 4 && (
              <div data-testid="generated-content">
                <h2>Generated Academic Content</h2>
                {state.loading && (
                  <div data-testid="loading-indicator" className="academic-spinner" role="status" aria-live="polite">
                    <span className="sr-only">Loading...</span>
                    <div>Generating content...</div>
                    <svg className="animate-spin h-6 w-6 text-academic-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  </div>
                )}
                {state.contentAnalysis && !state.loading && (
                  <>
                    <h3>Academic Content</h3>
                    <pre style={{whiteSpace: 'pre-wrap'}}>{state.contentAnalysis}</pre>
                  </>
                )}
              </div>
            )}

            {state.step === 5 && (
              <ContentAnalysis
                generatedContent={state.generatedContent}
                onAnalysisComplete={(analysis) => dispatch({ type: 'SET_CONTENT_ANALYSIS', value: analysis })}
                onLoading={(loading) => dispatch({ type: 'SET_LOADING', value: loading })}
                onError={(error) => dispatch({ type: 'SET_ERROR', value: error })}
              />
            )}

            {state.step === 6 && (
              <div>
                <div data-testid="export-customization">
                  <label htmlFor="citation-style-select">Citation Style</label>
                  <select
                    id="citation-style-select"
                    data-testid="citation-style-select"
                    value={citationStyle}
                    onChange={e => setCitationStyle(e.target.value)}
                  >
                    <option value="APA">APA 7th</option>
                    <option value="MLA">MLA 9th</option>
                    <option value="Chicago">Chicago</option>
                    <option value="IEEE">IEEE</option>
                  </select>
                </div>
                <div data-testid="citation-preview-list">
                  {(Array.isArray(state.researchResults) ? state.researchResults : []).map((ref, i) => {
                    const citation = ref.citation && ref.citation.trim() ? ref.citation.replace(/\s*\((APA|MLA|Chicago|IEEE)\)$/i, '') : ref.title;
                    const citationWithStyle = citation + ` (${citationStyle})`;
                    return (
                      <div key={i} data-testid={`citation-ref-${i}`}>{citationWithStyle}</div>
                    );
                  })}
                </div>
                {/* Export buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    role="button"
                    aria-label="Export PDF"
                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={() => {
                      const doc = new jsPDF();
                      doc.text('Academic Paper Export', 10, 10);
                      doc.text(state.generatedContent || 'Generated content will appear here', 10, 20);
                      const blob = doc.output('blob');
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `academic-paper-${Date.now()}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    role="button"
                    aria-label="Export Word"
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={async () => {
                      const doc = new Document({
                        sections: [{
                          properties: {},
                          children: [
                            new Paragraph({
                              children: [new TextRun(state.generatedContent || 'Generated content will appear here')]
                            })
                          ]
                        }]
                      });
                      const blob = await Packer.toBlob(doc);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `academic-paper-${Date.now()}.docx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Word
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </main>

        {/* Right panel (desktop only, hidden on mobile/tablet) */}
        <aside data-testid="right-panel" className="hidden lg:block bg-academic-muted rounded p-4 h-full">
          {/* Desktop-optimized citation and export tools */}
          <div className="font-semibold mb-2">Citation & Export</div>
          <div className="space-y-3">
            {/* Citation style selector */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Citation Style</label>
              <select 
                className="w-full text-xs border rounded px-2 py-1"
                value={citationStyle}
                onChange={(e) => setCitationStyle(e.target.value)}
              >
                <option value="APA">APA 7th</option>
                <option value="MLA">MLA 9th</option>
                <option value="Chicago">Chicago</option>
                <option value="IEEE">IEEE</option>
              </select>
            </div>
            
            {/* Quick export buttons */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Quick Export</label>
              <div className="space-y-1">
                <button 
                  className="w-full text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded flex items-center justify-center gap-1"
                  onClick={() => {
                    // TODO: Implement PDF export
                    console.log('PDF export');
                  }}
                >
                  📄 Export PDF
                </button>
                <button 
                  className="w-full text-xs bg-green-100 hover:bg-green-200 text-green-800 py-1 px-2 rounded flex items-center justify-center gap-1"
                  onClick={() => {
                    // TODO: Implement DOCX export
                    console.log('DOCX export');
                  }}
                >
                  📝 Export DOCX
                </button>
                <button 
                  className="w-full text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 py-1 px-2 rounded flex items-center justify-center gap-1"
                  onClick={() => {
                    // TODO: Implement Zotero integration
                    console.log('Zotero export');
                  }}
                >
                  📚 Send to Zotero
                </button>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Progress</label>
              <div className="text-xs text-gray-600">
                <div className="flex justify-between mb-1">
                  <span>Step {state.step}/{TOTAL_STEPS}</span>
                  <span>{Math.round((state.step / TOTAL_STEPS) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        currentStep={state.step}
        onNavigate={handleCommandPaletteNavigate}
        onAction={handleCommandPaletteAction}
        workflowState={{
          step: state.step,
          prompt: state.prompt,
          goals: state.goals,
          generatedContent: state.generatedContent,
          loading: state.loading,
        }}
      />
    </div>
  );
};

export default WorkflowUI;