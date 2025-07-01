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
  | { type: 'SET_CONTENT'; value: string }
  | { type: 'SET_STEP'; value: number };

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
    case 'SET_STEP':
      return { ...state, step: Math.max(1, Math.min(action.value, TOTAL_STEPS)) };
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
  const [showError, setShowError] = React.useState(true);
  const [editingCitationIdx, setEditingCitationIdx] = React.useState<number | null>(null);
  const [citationEdits, setCitationEdits] = React.useState<{ [idx: number]: string }>({});
  const [showAddRef, setShowAddRef] = React.useState(false);
  const [newRef, setNewRef] = React.useState({ title: '', authors: '', year: '', citation: '' });
  const [citationStyle, setCitationStyle] = React.useState('APA');
  const [selectedSections, setSelectedSections] = React.useState<string[]>([]);
  const [fileFormat, setFileFormat] = React.useState<'PDF' | 'Word'>('PDF');

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

  function saveRef() {
    if (!newRef.title) return;
    const ref = {
      title: newRef.title,
      authors: newRef.authors.split(',').map(a => a.trim()),
      year: Number(newRef.year) || 0,
      citation: newRef.citation
    };
    dispatch({ type: 'SET_REFERENCES', value: [...state.references, ref] });
    setShowAddRef(false);
    setNewRef({ title: '', authors: '', year: '', citation: '' });
  }

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
        <div data-testid="section-title" className="text-xl font-semibold mt-4 mb-2">Assignment Prompt</div>
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
        {state.step === 2 && state.outline && (
          <div>
            {state.outline.split('\n').map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
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
        {state.step === 3 && state.references.length > 0 && (
          <div>
            <button data-testid="add-reference-btn" onClick={() => setShowAddRef(true)}>Add Reference</button>
            {showAddRef && (
              <div>
                <input data-testid="reference-title-input" placeholder="Title" value={newRef.title} onChange={e => setNewRef({ ...newRef, title: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { saveRef(); } }} />
                <input data-testid="reference-authors-input" placeholder="Authors" value={newRef.authors} onChange={e => setNewRef({ ...newRef, authors: e.target.value })} />
                <input data-testid="reference-year-input" placeholder="Year" value={newRef.year} onChange={e => setNewRef({ ...newRef, year: e.target.value })} />
                <input data-testid="reference-citation-input" placeholder="Citation" value={newRef.citation} onChange={e => setNewRef({ ...newRef, citation: e.target.value })} />
                <button data-testid="save-reference-btn" onClick={saveRef}>Save</button>
              </div>
            )}
            <div data-testid="citations-section" className="mt-6">
              <div className="font-semibold mb-2">Citations</div>
              {state.references.map((ref, idx) => (
                <div key={idx} className="mb-2">
                  {editingCitationIdx === idx ? (
                    <>
                      <input
                        data-testid={`citation-edit-input-${idx}`}
                        value={citationEdits[idx] ?? ref.citation}
                        onChange={e => setCitationEdits({ ...citationEdits, [idx]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const newRefs = [...state.references];
                            newRefs[idx] = { ...newRefs[idx], citation: citationEdits[idx] ?? ref.citation };
                            dispatch({ type: 'SET_REFERENCES', value: newRefs });
                            setEditingCitationIdx(null);
                          }
                        }}
                      />
                      <button data-testid={`save-citation-${idx}`} onClick={() => {
                        const newRefs = [...state.references];
                        newRefs[idx] = { ...newRefs[idx], citation: citationEdits[idx] ?? ref.citation };
                        dispatch({ type: 'SET_REFERENCES', value: newRefs });
                        setEditingCitationIdx(null);
                      }}>Save</button>
                    </>
                  ) : (
                    <>
                      <span data-testid={`citation-${idx}`}>{ref.citation}</span>
                      <button data-testid={`edit-citation-${idx}`} onClick={() => setEditingCitationIdx(idx)}>Edit</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {state.references.map((ref, idx) => (
              <div key={idx} data-testid={`reference-${idx}`}>
                <div>{ref.title}</div>
                <div>{ref.authors.join(', ')}</div>
                <div>{ref.year}</div>
                <div>{ref.citation}</div>
                <button data-testid={`remove-reference-${idx}`} onClick={() => {
                  const newRefs = state.references.filter((_, i) => i !== idx);
                  dispatch({ type: 'SET_REFERENCES', value: newRefs });
                }}>Remove</button>
                {idx > 0 && (
                  <button data-testid={`move-reference-up-${idx}`} onClick={() => {
                    const newRefs = [...state.references];
                    const temp = newRefs[idx - 1];
                    newRefs[idx - 1] = newRefs[idx];
                    newRefs[idx] = temp;
                    dispatch({ type: 'SET_REFERENCES', value: newRefs });
                  }}>Move Up</button>
                )}
              </div>
            ))}
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
        {state.step === 4 && state.content && (
          <div>
            {state.content}
            <div data-testid="export-customization" className="mt-4">
              <label htmlFor="citation-style-select">Citation Style</label>
              <select
                id="citation-style-select"
                data-testid="citation-style-select"
                value={citationStyle}
                onChange={e => setCitationStyle(e.target.value)}
                onKeyDown={e => {
                  const styles = ['APA', 'MLA', 'Chicago'];
                  let idx = styles.indexOf(citationStyle);
                  if (e.key === 'ArrowDown') {
                    idx = (idx + 1) % styles.length;
                    setCitationStyle(styles[idx]);
                    e.preventDefault();
                  } else if (e.key === 'ArrowUp') {
                    idx = (idx - 1 + styles.length) % styles.length;
                    setCitationStyle(styles[idx]);
                    e.preventDefault();
                  } else if (e.key === 'Enter') {
                    // no-op for now
                  }
                }}
              >
                <option value="APA">APA</option>
                <option value="MLA">MLA</option>
                <option value="Chicago">Chicago</option>
              </select>
              <div className="mt-2">Sections to Export:</div>
              {['Introduction', 'Methods'].map(section => (
                <label key={section}>
                  <input
                    type="checkbox"
                    data-testid={`section-checkbox-${section}`}
                    checked={selectedSections.includes(section)}
                    onChange={e => {
                      setSelectedSections(sel => e.target.checked ? [...sel, section] : sel.filter(s => s !== section));
                    }}
                  />
                  {section}
                </label>
              ))}
              <div className="mt-2">File Format:</div>
              <label>
                <input
                  type="radio"
                  data-testid="file-format-pdf"
                  checked={fileFormat === 'PDF'}
                  onChange={() => setFileFormat('PDF')}
                /> PDF
              </label>
              <label>
                <input
                  type="radio"
                  data-testid="file-format-word"
                  checked={fileFormat === 'Word'}
                  onChange={() => setFileFormat('Word')}
                /> Word
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={() => {
                handleExportPDF();
                setExportMessage(`Exported with ${citationStyle} style: ${selectedSections.join(', ')}`);
              }}>Export PDF</button>
              <button type="button" onClick={() => {
                handleExportWord();
                setExportMessage(`Exported with ${citationStyle} style: ${selectedSections.join(', ')}`);
              }}>Export Word</button>
            </div>
            {exportMessage && <div>{exportMessage}</div>}
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkflowUI; 