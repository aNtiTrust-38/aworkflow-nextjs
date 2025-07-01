import React, { useReducer } from 'react';

const TOTAL_STEPS = 3;

interface WorkflowState {
  step: number;
  prompt: string;
  loading: boolean;
  outline: string | null;
}

type WorkflowAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_PROMPT'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_OUTLINE'; value: string };

const initialState: WorkflowState = {
  step: 1,
  prompt: '',
  loading: false,
  outline: null,
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
    default:
      return state;
  }
}

const WorkflowUI: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleNext = async () => {
    if (state.step === 1) {
      dispatch({ type: 'SET_LOADING', value: true });
      dispatch({ type: 'NEXT_STEP' });
      try {
        const resp = await fetch('/api/outline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: state.prompt }),
        });
        const data = await resp.json();
        dispatch({ type: 'SET_OUTLINE', value: data.outline || '' });
      } catch {
        dispatch({ type: 'SET_OUTLINE', value: 'Error loading outline.' });
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
      {state.step === 2 && state.outline && (
        <div>
          {state.outline.split('\n').map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowUI; 