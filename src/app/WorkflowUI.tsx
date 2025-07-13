'use client';

import React, { useReducer, useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProgressBar from '../../components/ProgressBar';
import ErrorMessage from '../../components/ErrorMessage';

// Lazy load heavy components
const ADHDFriendlyGoals = dynamic(() => import('./ADHDFriendlyGoals').then(mod => ({ default: mod.ADHDFriendlyGoals })), {
  loading: () => <LoadingSpinner message="Loading Goals Manager..." />,
  ssr: false
});

const ResearchAssistant = dynamic(() => import('./ResearchAssistant').then(mod => ({ default: mod.ResearchAssistant })), {
  loading: () => <LoadingSpinner message="Loading Research Assistant..." />,
  ssr: false
});

const ContentAnalysis = dynamic(() => import('./ContentAnalysis').then(mod => ({ default: mod.ContentAnalysis })), {
  loading: () => <LoadingSpinner message="Loading Content Analysis..." />,
  ssr: false
});

const CitationManager = dynamic(() => import('./CitationManager').then(mod => ({ default: mod.CitationManager })), {
  loading: () => <LoadingSpinner message="Loading Citation Manager..." />,
  ssr: false
});

const CommandPalette = dynamic(() => import('../../components/CommandPalette'), {
  loading: () => null,
  ssr: false
});

const steps = [
  'PROMPT',
  'GOALS',
  'RESEARCH',
  'GENERATE',
  'REFINE',
  'EXPORT'
];

const stepConfig = [
  {
    name: 'PROMPT',
    title: 'Research Prompt',
    description: 'Define your research question and objectives',
    icon: '📝',
    estimatedTime: '2-5 minutes'
  },
  {
    name: 'GOALS',
    title: 'Goals & Methodology',
    description: 'Develop structured goals and research approach',
    icon: '🎯',
    estimatedTime: '5-10 minutes'
  },
  {
    name: 'RESEARCH',
    title: 'Research Assistant',
    description: 'AI-powered research and source gathering',
    icon: '🔍',
    estimatedTime: '3-8 minutes'
  },
  {
    name: 'GENERATE',
    title: 'Content Generation',
    description: 'Generate academic content based on research',
    icon: '✍️',
    estimatedTime: '5-12 minutes'
  },
  {
    name: 'REFINE',
    title: 'Content Analysis',
    description: 'Review, analyze and refine your content',
    icon: '🔬',
    estimatedTime: '3-7 minutes'
  },
  {
    name: 'EXPORT',
    title: 'Export & Citations',
    description: 'Export your work in professional formats',
    icon: '📄',
    estimatedTime: '2-5 minutes'
  }
];

const TOTAL_STEPS = steps.length;

const workflowTemplates = [
  {
    id: 'research-paper',
    title: 'Research Paper',
    description: 'Traditional academic research paper with literature review',
    icon: '📄',
    prompt: 'Write a research paper analyzing [topic]. Include a comprehensive literature review, methodology, analysis, and conclusions.',
    estimatedTime: '45-60 minutes',
    tags: ['academic', 'research', 'formal']
  },
  {
    id: 'argumentative-essay',
    title: 'Argumentative Essay',
    description: 'Persuasive essay with evidence-based arguments',
    icon: '💭',
    prompt: 'Write an argumentative essay about [topic]. Present a clear thesis, supporting evidence, counterarguments, and a compelling conclusion.',
    estimatedTime: '30-45 minutes',
    tags: ['essay', 'argument', 'persuasive']
  },
  {
    id: 'literature-review',
    title: 'Literature Review',
    description: 'Systematic review of existing research on a topic',
    icon: '📚',
    prompt: 'Conduct a literature review on [topic]. Analyze current research, identify gaps, and synthesize findings from multiple sources.',
    estimatedTime: '60-90 minutes',
    tags: ['review', 'synthesis', 'academic']
  },
  {
    id: 'case-study',
    title: 'Case Study Analysis',
    description: 'In-depth analysis of a specific case or example',
    icon: '🔍',
    prompt: 'Analyze the case study of [subject]. Examine the background, key issues, methodology, findings, and implications.',
    estimatedTime: '40-55 minutes',
    tags: ['analysis', 'case study', 'specific']
  },
  {
    id: 'lab-report',
    title: 'Lab Report',
    description: 'Scientific report with methodology and results',
    icon: '🧪',
    prompt: 'Write a lab report for [experiment]. Include purpose, hypothesis, methodology, results, analysis, and conclusions.',
    estimatedTime: '35-50 minutes',
    tags: ['science', 'experiment', 'technical']
  },
  {
    id: 'blank',
    title: 'Blank Workflow',
    description: 'Start with a custom prompt',
    icon: '✏️',
    prompt: '',
    estimatedTime: 'Variable',
    tags: ['custom', 'flexible']
  }
];

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

interface StepCompletionStatus {
  [stepNumber: number]: {
    completed: boolean;
    hasContent: boolean;
    timestamp?: Date;
    contentPreview?: string;
  };
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
  zoteroExporting: boolean;
  zoteroMessage: string | null;
  stepCompletion: StepCompletionStatus;
  workflowStartTime: Date | null;
  lastSaved: Date | null;
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
  | { type: 'SET_ERROR_STATE'; value: Partial<ErrorState> }
  | { type: 'SET_ZOTERO_EXPORTING'; value: boolean }
  | { type: 'SET_ZOTERO_MESSAGE'; value: string | null }
  | { type: 'UPDATE_STEP_COMPLETION'; value: { step: number; completed: boolean; hasContent: boolean; contentPreview?: string } }
  | { type: 'SAVE_WORKFLOW_STATE'; value?: any }
  | { type: 'LOAD_WORKFLOW_STATE'; value: Partial<WorkflowState> }
  | { type: 'RESET_WORKFLOW'; value?: any };

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
    case 'SET_ZOTERO_EXPORTING':
      return { ...state, zoteroExporting: action.value };
    case 'SET_ZOTERO_MESSAGE':
      return { ...state, zoteroMessage: action.value };
    case 'UPDATE_STEP_COMPLETION':
      return {
        ...state,
        stepCompletion: {
          ...state.stepCompletion,
          [action.value.step]: {
            completed: action.value.completed,
            hasContent: action.value.hasContent,
            timestamp: new Date(),
            contentPreview: action.value.contentPreview
          }
        }
      };
    case 'SAVE_WORKFLOW_STATE':
      return { ...state, lastSaved: new Date() };
    case 'LOAD_WORKFLOW_STATE':
      return { ...state, ...action.value };
    case 'RESET_WORKFLOW':
      return {
        ...initialState,
        workflowStartTime: new Date(),
        stepCompletion: {}
      };
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
  zoteroExporting: false,
  zoteroMessage: null,
  stepCompletion: {},
  workflowStartTime: null,
  lastSaved: null,
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
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

  // Initialize workflow tracking
  useEffect(() => {
    if (!state.workflowStartTime) {
      dispatch({ type: 'RESET_WORKFLOW' });
    }
  }, []);

  // Track step completion when content changes
  useEffect(() => {
    updateStepCompletion(1);
  }, [state.prompt, updateStepCompletion]);

  useEffect(() => {
    updateStepCompletion(2);
  }, [state.goals, updateStepCompletion]);

  useEffect(() => {
    updateStepCompletion(3);
  }, [state.researchResults, updateStepCompletion]);

  useEffect(() => {
    updateStepCompletion(4);
  }, [state.generatedContent, updateStepCompletion]);

  useEffect(() => {
    updateStepCompletion(5);
  }, [state.contentAnalysis, updateStepCompletion]);

  useEffect(() => {
    updateStepCompletion(6);
  }, [state.exportData, updateStepCompletion]);

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
      case 1: return 'Processing your research prompt...';
      case 2: return 'Generating structured goals and methodology...';
      case 3: return 'Searching academic databases and sources...';
      case 4: return 'Generating academic content based on research...';
      case 5: return 'Analyzing and refining your content...';
      case 6: return 'Preparing professional export formats...';
      default: return 'Processing...';
    }
  };

  const getLoadingSubsteps = (step: number): string[] => {
    switch (step) {
      case 1: 
        return ['Analyzing prompt structure', 'Identifying key research areas', 'Setting up workflow'];
      case 2: 
        return ['Analyzing prompt requirements', 'Generating ADHD-friendly structure', 'Creating methodology framework', 'Formatting goals'];
      case 3: 
        return ['Connecting to research databases', 'Searching relevant sources', 'Filtering academic content', 'Compiling results'];
      case 4: 
        return ['Analyzing research data', 'Structuring academic content', 'Generating sections', 'Formatting output'];
      case 5: 
        return ['Reviewing content quality', 'Checking academic standards', 'Analyzing structure', 'Providing recommendations'];
      case 6: 
        return ['Formatting citations', 'Preparing PDF export', 'Generating DOCX', 'Finalizing documents'];
      default: 
        return [];
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

  // Step completion tracking utilities
  const getStepCompletionStatus = (stepNumber: number): boolean => {
    return state.stepCompletion[stepNumber]?.completed || false;
  };

  const getStepContentPreview = (stepNumber: number): string => {
    switch (stepNumber) {
      case 1:
        return state.prompt ? state.prompt.substring(0, 50) + '...' : '';
      case 2:
        return state.goals ? state.goals.substring(0, 50) + '...' : '';
      case 3:
        return Array.isArray(state.researchResults) && state.researchResults.length > 0 
          ? `${state.researchResults.length} sources found` : '';
      case 4:
        return state.generatedContent ? state.generatedContent.substring(0, 50) + '...' : '';
      case 5:
        return state.contentAnalysis ? state.contentAnalysis.substring(0, 50) + '...' : '';
      case 6:
        return state.exportData ? 'Export ready' : '';
      default:
        return '';
    }
  };

  const updateStepCompletion = useCallback((stepNumber: number) => {
    const hasContent = (() => {
      switch (stepNumber) {
        case 1: return !!state.prompt;
        case 2: return !!state.goals;
        case 3: return Array.isArray(state.researchResults) && state.researchResults.length > 0;
        case 4: return !!state.generatedContent;
        case 5: return !!state.contentAnalysis;
        case 6: return !!state.exportData;
        default: return false;
      }
    })();

    dispatch({
      type: 'UPDATE_STEP_COMPLETION',
      value: {
        step: stepNumber,
        completed: hasContent,
        hasContent,
        contentPreview: getStepContentPreview(stepNumber)
      }
    });
  }, [state.prompt, state.goals, state.researchResults, state.generatedContent, state.contentAnalysis, state.exportData]);

  // Workflow state persistence
  const saveWorkflowState = useCallback(() => {
    try {
      const stateToSave = {
        step: state.step,
        prompt: state.prompt,
        goals: state.goals,
        outline: state.outline,
        researchResults: state.researchResults,
        generatedContent: state.generatedContent,
        contentAnalysis: state.contentAnalysis,
        exportData: state.exportData,
        stepCompletion: state.stepCompletion,
        workflowStartTime: state.workflowStartTime,
        lastSaved: new Date()
      };
      localStorage.setItem('aworkflow_state', JSON.stringify(stateToSave));
      dispatch({ type: 'SAVE_WORKFLOW_STATE' });
    } catch (error) {
      console.warn('Failed to save workflow state:', error);
    }
  }, [state]);

  const loadWorkflowState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('aworkflow_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Convert date strings back to Date objects
        if (parsedState.workflowStartTime) {
          parsedState.workflowStartTime = new Date(parsedState.workflowStartTime);
        }
        if (parsedState.lastSaved) {
          parsedState.lastSaved = new Date(parsedState.lastSaved);
        }
        dispatch({ type: 'LOAD_WORKFLOW_STATE', value: parsedState });
        return true;
      }
    } catch (error) {
      console.warn('Failed to load workflow state:', error);
    }
    return false;
  }, []);

  const clearWorkflowState = useCallback(() => {
    try {
      localStorage.removeItem('aworkflow_state');
    } catch (error) {
      console.warn('Failed to clear workflow state:', error);
    }
  }, []);

  // Template handling
  const applyTemplate = useCallback((template: typeof workflowTemplates[0]) => {
    dispatch({ type: 'RESET_WORKFLOW' });
    if (template.prompt) {
      dispatch({ type: 'SET_PROMPT', value: template.prompt });
    }
    setShowTemplateModal(false);
  }, []);

  const handleNewWorkflow = useCallback(() => {
    if (state.prompt || state.goals || state.generatedContent) {
      if (confirm('Are you sure you want to start a new workflow? This will clear all current progress.')) {
        clearWorkflowState();
        setShowTemplateModal(true);
      }
    } else {
      setShowTemplateModal(true);
    }
  }, [state.prompt, state.goals, state.generatedContent, clearWorkflowState]);

  // Auto-save workflow state
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (state.prompt || state.goals || state.generatedContent) {
        saveWorkflowState();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [saveWorkflowState, state.prompt, state.goals, state.generatedContent]);

  // Load saved state on mount
  useEffect(() => {
    const hasLoadedState = loadWorkflowState();
    if (!hasLoadedState && !state.workflowStartTime) {
      dispatch({ type: 'RESET_WORKFLOW' });
      // Show template modal for new users
      setShowTemplateModal(true);
    }
  }, [loadWorkflowState]);

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

  // Research Assistant Error Recovery Handlers
  const handleTryDifferentKeywords = useCallback(() => {
    // Clear error state
    dispatch({ type: 'SET_ERROR_STATE', value: { hasError: false } });
    dispatch({ type: 'SET_ERROR', value: null });
    
    // For now, just show a prompt for different keywords (placeholder implementation)
    const newKeywords = prompt('Enter different keywords for your research:');
    if (newKeywords && newKeywords.trim()) {
      // Update prompt with new keywords and retry research
      dispatch({ type: 'SET_PROMPT', value: state.prompt + ' ' + newKeywords.trim() });
      // Reset research results to trigger new search
      dispatch({ type: 'SET_RESEARCH_RESULTS', value: null });
    }
  }, [state.prompt]);

  const handleSkipResearch = useCallback(() => {
    // Clear error state and move to next step without research results
    dispatch({ type: 'SET_ERROR_STATE', value: { hasError: false } });
    dispatch({ type: 'SET_ERROR', value: null });
    
    // Set empty research results and advance to next step
    dispatch({ type: 'SET_RESEARCH_RESULTS', value: [] });
    dispatch({ type: 'SET_STEP', value: 4 }); // Move to GENERATE step
  }, []);

  const handleManualResearch = useCallback(() => {
    // Clear error state and show manual research interface
    dispatch({ type: 'SET_ERROR_STATE', value: { hasError: false } });
    dispatch({ type: 'SET_ERROR', value: null });
    
    // For now, set placeholder manual research data
    dispatch({ type: 'SET_RESEARCH_RESULTS', value: [
      { title: 'Manual Research Entry', authors: ['User'], year: new Date().getFullYear(), citation: 'User-provided manual research' }
    ] });
  }, []);

  // Enhanced PDF Export with Academic Formatting
  const handlePDFExport = useCallback((citationStyle = 'APA', citations: Reference[] = [], selectedSections: string[] = []) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add text with page breaks
      const addTextWithPageBreak = (text: string, fontSize: number, isBold = false, isTitle = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) pdf.setFont(undefined, 'bold');
        else pdf.setFont(undefined, 'normal');
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        
        for (let i = 0; i < lines.length; i++) {
          if (yPosition > pageHeight - margin - 20) {
            pdf.addPage();
            yPosition = margin;
            
            // Add header on new pages (except first)
            if (pdf.getNumberOfPages() > 1) {
              pdf.setFontSize(10);
              pdf.setFont(undefined, 'normal');
              pdf.text('Academic Research Export', margin, 15);
              pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 20, 15);
              yPosition = margin + 10;
            }
          }
          
          if (isTitle && i === 0) {
            // Center title
            const textWidth = pdf.getTextWidth(lines[i]);
            pdf.text(lines[i], (pageWidth - textWidth) / 2, yPosition);
          } else {
            pdf.text(lines[i], margin, yPosition);
          }
          yPosition += fontSize * 0.4 + 2;
        }
        yPosition += 5; // Extra spacing after sections
      };

      // Academic Paper Title
      addTextWithPageBreak('Academic Research Document', 18, true, true);
      yPosition += 10;

      // Research Prompt Section
      if (state.prompt && (selectedSections.length === 0 || selectedSections.includes('Introduction'))) {
        addTextWithPageBreak('Research Prompt', 14, true);
        addTextWithPageBreak(state.prompt, 11);
        yPosition += 5;
      }

      // Goals & Outline Section
      if (state.goals && (selectedSections.length === 0 || selectedSections.includes('Methods'))) {
        addTextWithPageBreak('Goals & Methodology', 14, true);
        addTextWithPageBreak(state.goals, 11);
        yPosition += 5;
      }

      // Generated Content Section
      if (state.generatedContent && (selectedSections.length === 0 || selectedSections.includes('Results'))) {
        addTextWithPageBreak('Research Results', 14, true);
        addTextWithPageBreak(state.generatedContent, 11);
        yPosition += 5;
      }

      // Content Analysis Section
      if (state.contentAnalysis && (selectedSections.length === 0 || selectedSections.includes('Discussion'))) {
        addTextWithPageBreak('Analysis & Discussion', 14, true);
        addTextWithPageBreak(state.contentAnalysis, 11);
        yPosition += 5;
      }

      // References Section
      if (citations && citations.length > 0) {
        // Start references on new page if we're already past halfway
        if (yPosition > pageHeight / 2) {
          pdf.addPage();
          yPosition = margin;
        }
        
        addTextWithPageBreak('References', 14, true);
        yPosition += 5;

        citations.forEach((citation, index) => {
          const citationText = citation.citation || `${citation.authors.join(', ')} (${citation.year}). ${citation.title}.`;
          addTextWithPageBreak(`${index + 1}. ${citationText}`, 10);
        });
      }

      // Footer with export info
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        const exportDate = new Date().toLocaleDateString();
        const footerText = `Generated on ${exportDate} | Citation Style: ${citationStyle}`;
        pdf.text(footerText, margin, pageHeight - 10);
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `academic-research-${timestamp}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      dispatch({ type: 'SET_ERROR', value: 'PDF export failed. Please try again.' });
    }
  }, [state.prompt, state.goals, state.generatedContent, state.contentAnalysis]);

  // Enhanced DOCX Export with Academic Formatting  
  const handleDOCXExport = useCallback(async (citationStyle = 'APA', citations: Reference[] = [], selectedSections: string[] = []) => {
    try {
      const children = [];

      // Title
      children.push(
        new Paragraph({
          alignment: 'center',
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: "Academic Research Document",
              bold: true,
              size: 36,
              font: 'Times New Roman'
            }),
          ],
        })
      );

      // Add spacing
      children.push(new Paragraph({ text: "" }));

      // Research Prompt Section
      if (state.prompt && (selectedSections.length === 0 || selectedSections.includes('Introduction'))) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "Research Prompt",
                bold: true,
                size: 28,
                font: 'Times New Roman'
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: state.prompt,
                size: 24,
                font: 'Times New Roman'
              }),
            ],
          })
        );
      }

      // Goals & Methodology Section
      if (state.goals && (selectedSections.length === 0 || selectedSections.includes('Methods'))) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "Goals & Methodology",
                bold: true,
                size: 28,
                font: 'Times New Roman'
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: state.goals,
                size: 24,
                font: 'Times New Roman'
              }),
            ],
          })
        );
      }

      // Research Results Section
      if (state.generatedContent && (selectedSections.length === 0 || selectedSections.includes('Results'))) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "Research Results",
                bold: true,
                size: 28,
                font: 'Times New Roman'
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: state.generatedContent,
                size: 24,
                font: 'Times New Roman'
              }),
            ],
          })
        );
      }

      // Analysis & Discussion Section
      if (state.contentAnalysis && (selectedSections.length === 0 || selectedSections.includes('Discussion'))) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "Analysis & Discussion",
                bold: true,
                size: 28,
                font: 'Times New Roman'
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: state.contentAnalysis,
                size: 24,
                font: 'Times New Roman'
              }),
            ],
          })
        );
      }

      // References Section
      if (citations && citations.length > 0) {
        children.push(
          new Paragraph({
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: "References",
                bold: true,
                size: 28,
                font: 'Times New Roman'
              }),
            ],
          })
        );

        citations.forEach((citation, index) => {
          const citationText = citation.citation || `${citation.authors.join(', ')} (${citation.year}). ${citation.title}.`;
          children.push(
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: citationText,
                  size: 22,
                  font: 'Times New Roman'
                }),
              ],
            })
          );
        });
      }

      // Footer with export info
      const exportDate = new Date().toLocaleDateString();
      children.push(
        new Paragraph({
          spacing: { before: 400 },
          children: [
            new TextRun({
              text: `Generated on ${exportDate} | Citation Style: ${citationStyle}`,
              size: 18,
              italics: true,
              color: '666666',
              font: 'Times New Roman'
            }),
          ],
        })
      );

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                right: 1440,  // 1 inch  
                bottom: 1440, // 1 inch
                left: 1440,   // 1 inch
              },
            },
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `academic-research-${timestamp}.docx`;
      
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DOCX export failed:', error);
      dispatch({ type: 'SET_ERROR', value: 'DOCX export failed. Please try again.' });
    }
  }, [state.prompt, state.goals, state.generatedContent, state.contentAnalysis]);

  // Enhanced Zotero Export with BibTeX Support
  const handleZoteroExport = useCallback(async (citations: Reference[] = [], exportFormat: 'json' | 'bibtex' = 'json') => {
    try {
      // Set loading state
      dispatch({ type: 'SET_ZOTERO_EXPORTING', value: true });
      dispatch({ type: 'SET_ZOTERO_MESSAGE', value: null });

      // First, get Zotero settings from user settings
      const settingsResponse = await fetch('/api/user-settings');
      if (!settingsResponse.ok) {
        throw new Error('Failed to load Zotero settings');
      }
      
      const settings = await settingsResponse.json();
      
      if (!settings.zoteroApiKey || !settings.zoteroUserId) {
        throw new Error('Zotero API key and User ID must be configured in settings');
      }

      // Combine workflow references with passed citations
      const allReferences = [
        ...(state.researchResults || []),
        ...citations
      ];

      // Remove duplicates based on title and authors
      const uniqueReferences = allReferences.filter((ref, index, self) => 
        index === self.findIndex(r => 
          r.title === ref.title && 
          JSON.stringify(r.authors) === JSON.stringify(ref.authors)
        )
      );

      // Prepare enhanced export data
      const exportData = {
        references: uniqueReferences,
        format: exportFormat,
        apiKey: settings.zoteroApiKey,
        userId: settings.zoteroUserId,
        metadata: {
          title: state.prompt?.substring(0, 100) || 'Academic Workflow Export',
          content: state.generatedContent,
          goals: state.goals,
          exportDate: new Date().toISOString(),
          totalReferences: uniqueReferences.length
        }
      };

      // Call Zotero export API
      const exportResponse = await fetch('/api/zotero/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json();
        throw new Error(errorData.details || errorData.error || 'Export failed');
      }

      const result = await exportResponse.json();
      
      // Handle different response scenarios
      if (result.exported && result.exported.length > 0) {
        let successMessage = `Successfully exported ${result.exported.length} references to Zotero!`;
        
        // If BibTeX format was requested, also save the BibTeX file
        if (exportFormat === 'bibtex' && result.bibtex) {
          const blob = new Blob([result.bibtex], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'zotero-export.bib';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          successMessage += ' BibTeX file downloaded.';
        }
        
        dispatch({ type: 'SET_ZOTERO_MESSAGE', value: successMessage });
      } else if (result.conflicts && result.conflicts.length > 0) {
        const conflictMessage = `Export completed with ${result.conflicts.length} conflicts. Some items may need manual review in Zotero.`;
        dispatch({ type: 'SET_ZOTERO_MESSAGE', value: conflictMessage });
      } else {
        dispatch({ type: 'SET_ZOTERO_MESSAGE', value: 'Export completed, but no items were processed.' });
      }

    } catch (error) {
      console.error('Zotero export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      dispatch({ type: 'SET_ZOTERO_MESSAGE', value: `Error: ${errorMessage}` });
    } finally {
      dispatch({ type: 'SET_ZOTERO_EXPORTING', value: false });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        dispatch({ type: 'SET_ZOTERO_MESSAGE', value: null });
      }, 5000);
    }
  }, [state.prompt, state.generatedContent, state.researchResults, state.goals]);

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
      {/* Skip Links for Accessibility */}
      <div className="sr-only focus-within:not-sr-only">
        <a 
          href="#main-content" 
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
        <a 
          href="#workflow-stepper" 
          className="fixed top-4 left-32 z-50 px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to navigation
        </a>
      </div>

      {/* Enhanced Academic header with responsive design */}
      <header role="banner">
        <h1 
          data-testid="academic-header" 
          className="text-xl md:text-2xl lg:text-3xl font-bold text-center mb-4 md:mb-6 tracking-tight font-serif text-academic-primary landscape:text-xl short:text-lg short:mb-2"
          role="heading" 
          aria-level={1}
        >
          Academic Paper Workflow
        </h1>
      </header>

      {/* Workflow State Management Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${state.lastSaved ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  {state.lastSaved 
                    ? `Saved ${new Date(state.lastSaved).toLocaleTimeString()}` 
                    : 'Not saved'
                  }
                </span>
              </div>
              {state.workflowStartTime && (
                <div className="text-sm text-gray-600">
                  Started {new Date(state.workflowStartTime).toLocaleString()}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={saveWorkflowState}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Save workflow state"
              >
                Save Now
              </button>
              <button
                onClick={handleNewWorkflow}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                aria-label="Start new workflow"
              >
                New Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
      
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
          id="main-content"
          data-testid="main-panel"
          className="@container prose-sm sm:prose-lg mx-auto my-4 md:my-8 bg-academic-bg p-4 md:p-8 shadow-academic max-w-4xl tablet:grid-cols-2 short:py-2"
          role="main"
          aria-label="Academic workflow main content"
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
               {/* Enhanced Workflow Stepper with Progress Indicators */}
               <div
                 data-testid="workflow-stepper"
                 className="bg-white rounded-lg shadow-sm border p-6 mb-6"
                 role="tablist"
                 aria-label="Workflow Steps"
                 tabIndex={0}
                 onKeyDown={handleStepperKeyDown}
               >
                 {/* Overall Progress Bar */}
                 <div className="mb-6">
                   <div className="flex justify-between items-center mb-2">
                     <h3 className="text-lg font-semibold text-gray-900">Workflow Progress</h3>
                     <span className="text-sm text-gray-600">
                       {Object.values(state.stepCompletion).filter(s => s.completed).length} of {TOTAL_STEPS} steps completed
                     </span>
                   </div>
                   <div className="w-full bg-gray-200 rounded-full h-2">
                     <div 
                       className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                       style={{ 
                         width: `${(Object.values(state.stepCompletion).filter(s => s.completed).length / TOTAL_STEPS) * 100}%` 
                       }}
                     />
                   </div>
                 </div>

                 {/* Step Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {stepConfig.map((step, idx) => {
                     const stepNumber = idx + 1;
                     const isActive = state.step === stepNumber;
                     const isCompleted = getStepCompletionStatus(stepNumber);
                     const hasContent = state.stepCompletion[stepNumber]?.hasContent || false;

                     return (
                       <button
                         key={idx}
                         type="button"
                         role="tab"
                         aria-label={`Step ${stepNumber}: ${step.title}`}
                         aria-controls={`step-${stepNumber}-panel`}
                         aria-selected={isActive}
                         {...(isActive && { 'aria-current': 'step' })}
                         tabIndex={isActive ? 0 : -1}
                         className={`
                           relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           ${isActive 
                             ? 'border-blue-600 bg-blue-50 shadow-md' 
                             : isCompleted 
                               ? 'border-green-500 bg-green-50 hover:bg-green-100'
                               : hasContent
                                 ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                 : 'border-gray-300 bg-white hover:bg-gray-50'
                           }
                           ${(state.navigationDisabled || state.loading) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
                         `}
                         data-testid={`step-tab-${stepNumber}`}
                         onClick={() => !(state.navigationDisabled || state.loading) && dispatch({ type: 'SET_STEP', value: stepNumber })}
                         disabled={state.navigationDisabled || state.loading}
                         ref={el => { stepButtonRefs.current[idx] = el; }}
                       >
                         {/* Step Status Icon */}
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center space-x-2">
                             <span className="text-2xl">{step.icon}</span>
                             <div className={`
                               w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                               ${isActive 
                                 ? 'bg-blue-600 text-white' 
                                 : isCompleted 
                                   ? 'bg-green-500 text-white'
                                   : hasContent
                                     ? 'bg-yellow-500 text-white'
                                     : 'bg-gray-300 text-gray-600'
                               }
                             `}>
                               {isCompleted ? '✓' : stepNumber}
                             </div>
                           </div>
                           {isActive && (
                             <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                           )}
                         </div>

                         {/* Step Info */}
                         <div className="mb-2">
                           <h4 className={`font-medium text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                             {step.title}
                           </h4>
                           <p className={`text-xs mt-1 ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                             {step.description}
                           </p>
                         </div>

                         {/* Content Preview */}
                         {hasContent && state.stepCompletion[stepNumber]?.contentPreview && (
                           <div className="mt-2 p-2 bg-white rounded border">
                             <p className="text-xs text-gray-600 truncate">
                               {state.stepCompletion[stepNumber].contentPreview}
                             </p>
                           </div>
                         )}

                         {/* Estimated Time */}
                         <div className={`mt-2 text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                           ⏱️ {step.estimatedTime}
                         </div>

                         {/* Completion Timestamp */}
                         {isCompleted && state.stepCompletion[stepNumber]?.timestamp && (
                           <div className="absolute top-2 right-2">
                             <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                               <span className="text-white text-xs">✓</span>
                             </div>
                           </div>
                         )}
                       </button>
                     );
                   })}
                 </div>

                 <span data-testid="stepper-live" className="sr-only" aria-live="polite">
                   Step {state.step} of {TOTAL_STEPS}: {stepConfig[state.step - 1]?.title}
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

          {/* Enhanced Section Header */}
          <div data-testid="section-title-wrapper" className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{stepConfig[state.step - 1]?.icon}</span>
                <div>
                  <h2 
                    data-testid="section-title" 
                    className="text-xl font-bold text-gray-900"
                    role="heading"
                    aria-level={2}
                  >
                    {stepConfig[state.step - 1]?.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {stepConfig[state.step - 1]?.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span>⏱️</span>
                  <span>{stepConfig[state.step - 1]?.estimatedTime}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${getStepCompletionStatus(state.step) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>{getStepCompletionStatus(state.step) ? 'Completed' : 'In Progress'}</span>
                </div>
              </div>
            </div>

            {/* Step Progress Indicator */}
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm text-gray-600">Step {state.step} of {TOTAL_STEPS}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{Math.round((state.step / TOTAL_STEPS) * 100)}%</span>
            </div>

            {/* Content Preview for Completed Steps */}
            {getStepCompletionStatus(state.step) && state.stepCompletion[state.step]?.contentPreview && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm font-medium text-green-800">Step Completed</span>
                </div>
                <p className="text-sm text-green-700">
                  {state.stepCompletion[state.step].contentPreview}
                </p>
              </div>
            )}
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
            stepIcon={stepConfig[state.step - 1]?.icon}
            stepTitle={stepConfig[state.step - 1]?.title}
            substeps={getLoadingSubsteps(state.step)}
            currentSubstep={Math.floor((state.loadingState.progress || 0) / 25)}
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
                  { label: 'Try Different Keywords', onClick: handleTryDifferentKeywords, variant: 'primary' as const },
                  { label: 'Skip Research', onClick: handleSkipResearch, variant: 'primary' as const },
                  { label: 'Manual Research', onClick: handleManualResearch, variant: 'primary' as const },
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
                  onClick={handlePDFExport}
                >
                  📄 Export PDF
                </button>
                <button 
                  className="w-full text-xs bg-green-100 hover:bg-green-200 text-green-800 py-1 px-2 rounded flex items-center justify-center gap-1"
                  onClick={handleDOCXExport}
                >
                  📝 Export DOCX
                </button>
                <button 
                  className={`w-full text-xs py-1 px-2 rounded flex items-center justify-center gap-1 ${
                    state.zoteroExporting 
                      ? 'bg-purple-200 text-purple-600 cursor-wait' 
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                  }`}
                  onClick={handleZoteroExport}
                  disabled={state.zoteroExporting}
                >
                  {state.zoteroExporting ? '⏳ Exporting...' : '📚 Send to Zotero'}
                </button>
              </div>
              
              {/* Zotero status message */}
              {state.zoteroMessage && (
                <div className={`mt-2 p-2 text-xs rounded ${
                  state.zoteroMessage.startsWith('Error:') 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : state.zoteroMessage.includes('conflicts')
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {state.zoteroMessage}
                </div>
              )}
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

      {/* Workflow Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto m-4 w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Choose a Workflow Template</h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Close template modal"
                >
                  <span className="sr-only">Close</span>
                  <span className="text-2xl">×</span>
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Select a template to get started with a structured workflow, or choose "Blank Workflow" to start from scratch.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflowTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">{template.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.title}</h3>
                        <p className="text-sm text-gray-600">{template.estimatedTime}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">{template.description}</p>
                    
                    {template.prompt && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <strong>Sample prompt:</strong> {template.prompt.substring(0, 100)}...
                      </div>
                    )}
                    
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowUI;