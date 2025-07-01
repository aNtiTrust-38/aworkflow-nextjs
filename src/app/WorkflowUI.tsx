import React, { useReducer } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const RESEARCH_WORKFLOW_STEPS = [
  'INPUT',              // Assignment prompt + rubric upload
  "GOALS",              // ADHD-friendly A-grade objectives 
  "STRUCTURE_GUIDANCE", // Academic structure + format examples
  "RESEARCH_ASSISTANT", // Multi-source research discovery
  "CONTENT_ANALYSIS",   // Upload PDFs/docs for summarization
  "CITATION_MANAGEMENT" // APA 7 citations + Zotero export
];
const TOTAL_STEPS = RESEARCH_WORKFLOW_STEPS.length;

interface Reference {
  title: string;
  authors: string[];
  year: number;
  citation: string;
}

interface WorkflowState {
  step: number;
  prompt: string;
  loading: boolean;
  adhdFriendlyGoals: string | null;
  structureOutline: string | null;
  formatExamples: string | null;
  checklist: string[];
  researchResults: any | null;
  contentAnalysis: any | null;
  citations: any | null;
  error: string | null;
}

type WorkflowAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_STEP'; value: number }
  | { type: 'SET_PROMPT'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ADHD_GOALS'; value: string }
  | { type: 'SET_STRUCTURE_OUTLINE'; value: string }
  | { type: 'SET_FORMAT_EXAMPLES'; value: string }
  | { type: 'SET_CHECKLIST'; value: string[] }
  | { type: 'SET_RESEARCH_RESULTS'; value: any }
  | { type: 'SET_CONTENT_ANALYSIS'; value: any }
  | { type: 'SET_CITATIONS'; value: any }
  | { type: 'SET_ERROR'; value: string | null };

const initialState: WorkflowState = {
  step: 1,
  prompt: '',
  loading: false,
  adhdFriendlyGoals: null,
  structureOutline: null,
  formatExamples: null,
  checklist: [],
  researchResults: null,
  contentAnalysis: null,
  citations: null,
  error: null,
};

function reducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS) };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'SET_STEP':
      return { ...state, step: Math.max(1, Math.min(action.value, TOTAL_STEPS)) };
    case 'SET_PROMPT':
      return { ...state, prompt: action.value };
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SET_ADHD_GOALS':
      return { ...state, adhdFriendlyGoals: action.value };
    case 'SET_STRUCTURE_OUTLINE':
      return { ...state, structureOutline: action.value };
    case 'SET_FORMAT_EXAMPLES':
      return { ...state, formatExamples: action.value };
    case 'SET_CHECKLIST':
      return { ...state, checklist: action.value };
    case 'SET_RESEARCH_RESULTS':
      return { ...state, researchResults: action.value };
    case 'SET_CONTENT_ANALYSIS':
      return { ...state, contentAnalysis: action.value };
    case 'SET_CITATIONS':
      return { ...state, citations: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.value };
    default:
      return state;
  }
}

const WorkflowUI: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [exportMessage, setExportMessage] = React.useState<string | null>(null);
  const [showError, setShowError] = React.useState(true);
  const [editingCitationIdx, setEditingCitationIdx] = React.useState<number | null>(null);
  const [citationEdits, setCitationEdits] = React.useState<{ [idx: number]: string }>({});
  const [showAddRef, setShowAddRef] = React.useState(false);
  const [newRef, setNewRef] = React.useState({ title: '', authors: '', year: '', citation: '' });
  const [citationStyle, setCitationStyle] = React.useState('APA');
  const [selectedSections, setSelectedSections] = React.useState<string[]>([]);
  const [fileFormat, setFileFormat] = React.useState<'PDF' | 'Word'>('PDF');

  const handleNext = async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    dispatch({ type: 'SET_ERROR', value: null });
    // For now, just move to the next step (stub for new endpoints)
    dispatch({ type: 'NEXT_STEP' });
    dispatch({ type: 'SET_LOADING', value: false });
  };

  // PDF export handler
  // const handleExportPDF = () => {
  //   if (!state.content) return;
  //   const doc = new jsPDF();
  //   doc.text(state.content, 10, 10);
  //   const pdfBlob = doc.output('blob');
  //   const url = URL.createObjectURL(pdfBlob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = 'academic-paper.pdf';
  //   a.click();
  //   setTimeout(() => URL.revokeObjectURL(url), 1000);
  // };

  // DOCX export handler
  // const handleExportWord = async () => {
  //   if (!state.content) return;
  //   const doc = new Document({
  //     sections: [
  //       {
  //         properties: {},
  //         children: [
  //           new Paragraph({
  //             children: [new TextRun(state.content)],
  //           }),
  //         ],
  //       },
  //     ],
  //   });
  //   const blob = await Packer.toBlob(doc);
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = 'academic-paper.docx';
  //   a.click();
  //   setTimeout(() => URL.revokeObjectURL(url), 1000);
  // };

  // function saveRef() {
  //   if (!newRef.title) return;
  //   const ref = {
  //     title: newRef.title,
  //     authors: newRef.authors.split(',').map(a => a.trim()),
  //     year: Number(newRef.year) || 0,
  //     citation: newRef.citation
  //   };
  //   dispatch({ type: 'SET_REFERENCES', value: [...state.references, ref] });
  //   setShowAddRef(false);
  //   setNewRef({ title: '', authors: '', year: '', citation: '' });
  // }

  return (
    <div>
      {/* Academic header for professional theming */}
      <header data-testid="academic-header" className="text-3xl font-bold text-center mb-6 tracking-tight font-serif text-academic-primary">Academic Paper Workflow</header>
      <main data-testid="workflow-main" className="prose-sm sm:prose-lg mx-auto my-8 bg-academic-bg p-8 shadow-academic">
        <div
          data-testid="workflow-stepper"
          className="academic-stepper bg-academic-muted rounded px-4 py-2 mb-4 flex-col sm:flex-row gap-2 justify-center"
          tabIndex={0}
          onKeyDown={e => {
            const stepButtons = Array.from(document.querySelectorAll('[aria-label^="Step "]'));
            const active = document.activeElement;
            const idx = stepButtons.indexOf(active as HTMLElement);
            if (e.key === 'ArrowRight' && idx < stepButtons.length - 1) {
              (stepButtons[idx + 1] as HTMLElement).focus();
              e.preventDefault();
            } else if (e.key === 'ArrowLeft' && idx > 0) {
              (stepButtons[idx - 1] as HTMLElement).focus();
              e.preventDefault();
            } else if (e.key === 'Enter' && idx !== -1) {
              dispatch({ type: 'SET_STEP', value: idx + 1 });
              e.preventDefault();
            }
          }}
        >
          {[...Array(TOTAL_STEPS)].map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Step ${idx + 1}`}
              aria-current={state.step === idx + 1 ? 'step' : undefined}
              className={`step-btn px-3 py-1 rounded ${state.step === idx + 1 ? 'bg-academic-primary text-white font-bold' : 'bg-white text-academic-primary border'}`}
              onClick={() => dispatch({ type: 'SET_STEP', value: idx + 1 })}
            >
              {`Step ${idx + 1}`}
            </button>
          ))}
          <span data-testid="stepper-live" className="sr-only" aria-live="polite">{`Step ${state.step} of ${TOTAL_STEPS}`}</span>
        </div>
        <div data-testid="section-title" className="text-xl font-semibold mt-4 mb-2">
          {RESEARCH_WORKFLOW_STEPS[state.step - 1].replace(/_/g, ' ')}
        </div>
        <label htmlFor="prompt" className="sr-only">Assignment Prompt</label>
        <textarea
          id="prompt"
          aria-label="Assignment Prompt"
          value={state.prompt}
          onChange={e => dispatch({ type: 'SET_PROMPT', value: e.target.value })}
        />
        <button
          type="button"
          disabled={state.step === 1}
          onClick={() => dispatch({ type: 'PREV_STEP' })}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={state.step === TOTAL_STEPS}
          onClick={handleNext}
        >
          Next
        </button>
        {state.step === 2 && state.loading && (
          <div data-testid="loading-indicator" className="academic-spinner" role="status" aria-live="polite">
            <span className="sr-only">Loading outline...</span>
            <svg className="animate-spin h-6 w-6 text-academic-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
        {state.step === 2 && state.error && showError && (
          <div data-testid="error-alert" className="academic-error" role="alert">
            <span>{state.error}</span>
            <button onClick={() => setShowError(false)} aria-label="Dismiss error">Dismiss</button>
            <div className="text-sm mt-2">Please try again or reload the page to recover.</div>
          </div>
        )}
        {state.step === 3 && state.loading && (
          <div data-testid="loading-indicator" className="academic-spinner" role="status" aria-live="polite">
            <span className="sr-only">Loading research...</span>
            <svg className="animate-spin h-6 w-6 text-academic-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
        {state.step === 3 && state.error && showError && (
          <div data-testid="error-alert" className="academic-error" role="alert">
            <span>{state.error}</span>
            <button onClick={() => setShowError(false)} aria-label="Dismiss error">Dismiss</button>
            <div className="text-sm mt-2">Please try again or reload the page to recover.</div>
          </div>
        )}
        {state.step === 4 && state.loading && (
          <div data-testid="loading-indicator" className="academic-spinner" role="status" aria-live="polite">
            <span className="sr-only">Generating content...</span>
            <svg className="animate-spin h-6 w-6 text-academic-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
        {state.step === 4 && state.error && showError && (
          <div data-testid="error-alert" className="academic-error" role="alert">
            <span>{state.error}</span>
            <button onClick={() => setShowError(false)} aria-label="Dismiss error">Dismiss</button>
            <div className="text-sm mt-2">Please try again or reload the page to recover.</div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkflowUI; 