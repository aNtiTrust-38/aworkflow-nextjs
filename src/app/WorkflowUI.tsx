import React, { useReducer } from 'react';

const TOTAL_STEPS = 3;

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
}

type WorkflowAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_PROMPT'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_OUTLINE'; value: string }
  | { type: 'SET_ERROR'; value: string | null }
  | { type: 'SET_REFERENCES'; value: Reference[] };

const initialState: WorkflowState = {
  step: 1,
  prompt: '',
  loading: false,
  outline: null,
  error: null,
  references: [],
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

const WorkflowUI: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

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
    } else {
      dispatch({ type: 'NEXT_STEP' });
    }
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
    </div>
  );
};

export default WorkflowUI; 