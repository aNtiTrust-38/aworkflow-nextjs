import React, { useReducer } from 'react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const TOTAL_STEPS = 4;

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
  outline: string | null;
  error: string | null;
  references: Reference[];
  content: string | null;
}

type WorkflowAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_PROMPT'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_OUTLINE'; value: string }
  | { type: 'SET_ERROR'; value: string | null }
  | { type: 'SET_REFERENCES'; value: Reference[] }
  | { type: 'SET_CONTENT'; value: string };

const initialState: WorkflowState = {
  step: 1,
  prompt: '',
  loading: false,
  outline: null,
  error: null,
  references: [],
  content: null,
};

function reducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS) };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'SET_PROMPT':
      return { ...state, prompt: action.value };
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SET_OUTLINE':
      return { ...state, outline: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.value };
    case 'SET_REFERENCES':
      return { ...state, references: action.value };
    case 'SET_CONTENT':
      return { ...state, content: action.value };
    default:
      return state;
  }
}

async function fetchOutline(prompt: string): Promise<string> {
  const resp = await fetch('/api/outline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) {
    throw new Error('Failed to fetch outline');
  }
  const data = await resp.json();
  return data.outline || '';
}

async function fetchResearch(prompt: string): Promise<Reference[]> {
  const resp = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: prompt }),
  });
  if (!resp.ok) {
    throw new Error('Failed to fetch research');
  }
  const data = await resp.json();
  return data.references || [];
}

async function fetchGenerate(prompt: string, outline: string | null, references: Reference[]): Promise<string> {
  const resp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outline: outline ? outline.split('\n').map((section, idx) => ({ section: `Section ${idx + 1}`, content: section })) : [], references }),
  });
  if (!resp.ok) {
    throw new Error('Failed to generate content');
  }
  const data = await resp.json();
  return data.content || '';
}

const WorkflowUI: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [exportMessage, setExportMessage] = React.useState<string | null>(null);

  const handleNext = async () => {
    if (state.step === 1) {
      dispatch({ type: 'SET_LOADING', value: true });
      dispatch({ type: 'SET_ERROR', value: null });
      dispatch({ type: 'NEXT_STEP' });
      try {
        const outline = await fetchOutline(state.prompt);
        dispatch({ type: 'SET_OUTLINE', value: outline });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', value: 'Error loading outline.' });
        dispatch({ type: 'SET_OUTLINE', value: '' });
      } finally {
        dispatch({ type: 'SET_LOADING', value: false });
      }
    } else if (state.step === 2) {
      dispatch({ type: 'SET_LOADING', value: true });
      dispatch({ type: 'SET_ERROR', value: null });
      dispatch({ type: 'NEXT_STEP' });
      try {
        const references = await fetchResearch(state.prompt);
        dispatch({ type: 'SET_REFERENCES', value: references });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', value: 'Error loading research.' });
        dispatch({ type: 'SET_REFERENCES', value: [] });
      } finally {
        dispatch({ type: 'SET_LOADING', value: false });
      }
    } else if (state.step === 3) {
      dispatch({ type: 'SET_LOADING', value: true });
      dispatch({ type: 'SET_ERROR', value: null });
      dispatch({ type: 'NEXT_STEP' });
      try {
        const content = await fetchGenerate(state.prompt, state.outline, state.references);
        dispatch({ type: 'SET_CONTENT', value: content });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', value: 'Error generating content.' });
        dispatch({ type: 'SET_CONTENT', value: '' });
      } finally {
        dispatch({ type: 'SET_LOADING', value: false });
      }
    } else {
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  // PDF export handler
  const handleExportPDF = () => {
    if (!state.content) return;
    const doc = new jsPDF();
    doc.text(state.content, 10, 10);
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academic-paper.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // DOCX export handler
  const handleExportWord = async () => {
    if (!state.content) return;
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun(state.content)],
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academic-paper.docx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div>
      <div data-testid="workflow-stepper">{`Step ${state.step} of ${TOTAL_STEPS}`}</div>
      <label htmlFor="prompt">Assignment Prompt</label>
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
      {state.step === 2 && state.loading && <div>Loading outline...</div>}
      {state.step === 2 && state.error && <div style={{ color: 'red' }}>{state.error}</div>}
      {state.step === 2 && state.outline && (
        <div>
          {state.outline.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
      {state.step === 3 && state.loading && <div>Loading research...</div>}
      {state.step === 3 && state.error && <div style={{ color: 'red' }}>{state.error}</div>}
      {state.step === 3 && state.references.length > 0 && (
        <div>
          {state.references.map((ref, idx) => (
            <div key={idx} data-testid={`reference-${idx}`}>
              <div>{ref.title}</div>
              <div>{ref.authors.join(', ')}</div>
              <div>{ref.year}</div>
              <div>{ref.citation}</div>
            </div>
          ))}
        </div>
      )}
      {state.step === 4 && state.loading && <div>Generating content...</div>}
      {state.step === 4 && state.error && <div style={{ color: 'red' }}>{state.error}</div>}
      {state.step === 4 && state.content && (
        <div>
          {state.content}
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={handleExportPDF}>
              Export PDF
            </button>
            <button type="button" onClick={handleExportWord}>
              Export Word
            </button>
          </div>
          {exportMessage && <div>{exportMessage}</div>}
        </div>
      )}
    </div>
  );
};

export default WorkflowUI; 