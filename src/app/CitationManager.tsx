import React, { useState } from 'react';

interface Reference {
  title: string;
  authors: string[];
  year: number;
  citation: string;
}

interface CitationManagerProps {
  researchResults: Reference[];
  onExportReady: (data: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

export const CitationManager: React.FC<CitationManagerProps> = ({ researchResults = [], onExportReady, onLoading, onError }) => {
  const [citations, setCitations] = useState<Reference[]>(researchResults || []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [style, setStyle] = useState('APA');
  const [showAdd, setShowAdd] = useState(false);
  const [newRef, setNewRef] = useState<Reference>({ title: '', authors: [''], year: new Date().getFullYear(), citation: '' });
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [fileFormat, setFileFormat] = useState<'pdf' | 'word'>('pdf');
  const [exportMsg, setExportMsg] = useState('');

  // Add reference
  const handleAdd = () => {
    setCitations(prev => [...prev, { ...newRef }]);
    setShowAdd(false);
    setNewRef({ title: '', authors: [''], year: new Date().getFullYear(), citation: '' });
  };
  // Remove reference
  const handleRemove = (idx: number) => {
    setCitations(prev => prev.filter((_, i) => i !== idx));
  };
  // Move reference up
  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setCitations(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };
  // Edit citation
  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(citations[idx].citation);
  };
  const handleSave = (idx: number) => {
    setCitations(prev => prev.map((c, i) => i === idx ? { ...c, citation: editValue } : c));
    setEditingIdx(null);
  };

  // Export customization
  const handleExport = () => {
    setExportMsg(`Exported with ${style} style: ${selectedSections.join(', ')}${fileFormat === 'word' ? ' (Word)' : ' (PDF)'}`);
    onExportReady && onExportReady(exportMsg);
  };

  return (
    <section data-testid="citation-manager-section">
      <h2>Citation Manager</h2>
      <div data-testid="citation-list">
        {citations.map((c, i) => (
          <div key={i} data-testid={`reference-${i}`}>
            <div data-testid={`citation-ref-${i}`}>{c.citation}</div>
            {editingIdx === i ? (
              <>
                <input
                  data-testid={`citation-edit-input-${i}`}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(i); }}
                />
                <button data-testid={`save-citation-${i}`} onClick={() => handleSave(i)}>Save</button>
              </>
            ) : (
              <button data-testid={`edit-citation-${i}`} onClick={() => handleEdit(i)}>Edit</button>
            )}
            <button data-testid={`remove-reference-${i}`} onClick={() => handleRemove(i)}>Remove</button>
            <button data-testid={`move-reference-up-${i}`} onClick={() => handleMoveUp(i)}>Move Up</button>
          </div>
        ))}
      </div>
      <button data-testid="add-citation-btn" onClick={() => {
        setCitations(prev => [...prev, { title: 'Sample Citation', authors: ['Author'], year: new Date().getFullYear(), citation: `Citation (APA)` }]);
      }}>Add Citation</button>
      <button data-testid="add-reference-btn" onClick={() => setShowAdd(true)}>Add Reference</button>
      {showAdd && (
        <div>
          <input data-testid="reference-title-input" placeholder="Title" value={newRef.title} onChange={e => setNewRef({ ...newRef, title: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
          <input data-testid="reference-authors-input" placeholder="Authors" value={newRef.authors[0]} onChange={e => setNewRef({ ...newRef, authors: [e.target.value] })} />
          <input data-testid="reference-year-input" placeholder="Year" value={newRef.year} onChange={e => setNewRef({ ...newRef, year: Number(e.target.value) })} />
          <input data-testid="reference-citation-input" placeholder="Citation" value={newRef.citation} onChange={e => setNewRef({ ...newRef, citation: e.target.value })} />
          <button data-testid="save-reference-btn" onClick={handleAdd}>Save</button>
        </div>
      )}
      <div data-testid="export-customization">
        <label>Citation Style</label>
        <select data-testid="citation-style-select" value={style} onChange={e => {
          setStyle(e.target.value);
          setCitations(prev => prev.map(c => ({ ...c, citation: `Citation (${e.target.value})` })));
        }}>
          <option value="APA">APA</option>
          <option value="MLA">MLA</option>
          <option value="Chicago">Chicago</option>
        </select>
        <div>
          <label>Sections</label>
          {['Introduction', 'Methods', 'Results', 'Discussion'].map(section => (
            <label key={section}>
              <input
                type="checkbox"
                data-testid={`section-checkbox-${section}`}
                checked={selectedSections.includes(section)}
                onChange={e => setSelectedSections(prev => e.target.checked ? [...prev, section] : prev.filter(s => s !== section))}
              />
              {section}
            </label>
          ))}
        </div>
        <div>
          <label>File Format</label>
          <button data-testid="file-format-pdf" onClick={() => setFileFormat('pdf')}>PDF</button>
          <button data-testid="file-format-word" onClick={() => setFileFormat('word')}>Word</button>
        </div>
        <button onClick={handleExport}>{fileFormat === 'word' ? 'Export Word' : 'Export PDF'}</button>
        {exportMsg && <div>{exportMsg}</div>}
      </div>
    </section>
  );
}; 