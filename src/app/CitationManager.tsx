import React, { useState, useEffect, useMemo } from 'react';

interface Reference {
  title: string;
  authors: string[];
  year: number;
  citation: string;
  url?: string;
  doi?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
}

interface CitationManagerProps {
  researchResults: Reference[];
  onExportReady: (data: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
  citationStyle?: string;
  onCitationStyleChange?: (style: string) => void;
}

export const CitationManager: React.FC<CitationManagerProps> = ({ 
  researchResults = [], 
  onExportReady, 
  onLoading, 
  onError,
  citationStyle = 'APA',
  onCitationStyleChange
}) => {
  const [citations, setCitations] = useState<Reference[]>(researchResults || []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [style, setStyle] = useState(citationStyle);
  const [showAdd, setShowAdd] = useState(false);
  const [newRef, setNewRef] = useState<Reference>({ 
    title: '', 
    authors: [''], 
    year: new Date().getFullYear(), 
    citation: '',
    url: '',
    doi: '',
    journal: '',
    volume: '',
    issue: '',
    pages: ''
  });
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [fileFormat, setFileFormat] = useState<'pdf' | 'word'>('pdf');
  const [exportMsg, setExportMsg] = useState('');
  const [previewMode, setPreviewMode] = useState<'inline' | 'bibliography'>('inline');

  // Real-time citation formatting system
  const formatCitation = useMemo(() => {
    const formatters = {
      APA: (ref: Reference, isInline = false) => {
        const authorsList = ref.authors.length > 0 ? ref.authors : ['Unknown Author'];
        const year = ref.year || 'n.d.';
        
        if (isInline) {
          // In-text citation format
          if (authorsList.length === 1) {
            const lastName = authorsList[0].split(' ').pop() || authorsList[0];
            return `(${lastName}, ${year})`;
          } else if (authorsList.length === 2) {
            const lastName1 = authorsList[0].split(' ').pop() || authorsList[0];
            const lastName2 = authorsList[1].split(' ').pop() || authorsList[1];
            return `(${lastName1} & ${lastName2}, ${year})`;
          } else {
            const lastName = authorsList[0].split(' ').pop() || authorsList[0];
            return `(${lastName} et al., ${year})`;
          }
        } else {
          // Bibliography format
          const authorsFormatted = authorsList.map((author, idx) => {
            const parts = author.trim().split(' ');
            if (parts.length >= 2) {
              const lastName = parts.pop();
              const firstNames = parts.join(' ');
              return idx === 0 ? `${lastName}, ${firstNames.charAt(0)}.` : `${firstNames.charAt(0)}. ${lastName}`;
            }
            return author;
          });
          
          let formatted = `${authorsFormatted.join(', ')} (${year}). ${ref.title}`;
          
          if (ref.journal) {
            formatted += `. *${ref.journal}*`;
            if (ref.volume) formatted += `, ${ref.volume}`;
            if (ref.issue) formatted += `(${ref.issue})`;
            if (ref.pages) formatted += `, ${ref.pages}`;
          }
          
          if (ref.url) formatted += `. ${ref.url}`;
          if (ref.doi) formatted += `. https://doi.org/${ref.doi}`;
          
          return formatted + '.';
        }
      },
      
      MLA: (ref: Reference, isInline = false) => {
        const authorsList = ref.authors.length > 0 ? ref.authors : ['Unknown Author'];
        
        if (isInline) {
          // In-text citation format
          if (authorsList.length === 1) {
            const lastName = authorsList[0].split(' ').pop() || authorsList[0];
            return `(${lastName})`;
          } else if (authorsList.length === 2) {
            const lastName1 = authorsList[0].split(' ').pop() || authorsList[0];
            const lastName2 = authorsList[1].split(' ').pop() || authorsList[1];
            return `(${lastName1} and ${lastName2})`;
          } else {
            const lastName = authorsList[0].split(' ').pop() || authorsList[0];
            return `(${lastName} et al.)`;
          }
        } else {
          // Works Cited format
          const authorsFormatted = authorsList.map((author, idx) => {
            const parts = author.trim().split(' ');
            if (parts.length >= 2) {
              const lastName = parts.pop();
              const firstNames = parts.join(' ');
              return idx === 0 ? `${lastName}, ${firstNames}` : `${firstNames} ${lastName}`;
            }
            return author;
          });
          
          let formatted = `${authorsFormatted.join(', ')}. "${ref.title}."`;
          
          if (ref.journal) {
            formatted += ` *${ref.journal}*`;
            if (ref.volume) formatted += `, vol. ${ref.volume}`;
            if (ref.issue) formatted += `, no. ${ref.issue}`;
            formatted += `, ${ref.year}`;
            if (ref.pages) formatted += `, pp. ${ref.pages}`;
          } else {
            formatted += ` ${ref.year}`;
          }
          
          if (ref.url) formatted += `. Web. ${new Date().toLocaleDateString()}`;
          
          return formatted + '.';
        }
      },
      
      Chicago: (ref: Reference, isInline = false) => {
        const authorsList = ref.authors.length > 0 ? ref.authors : ['Unknown Author'];
        const year = ref.year || 'n.d.';
        
        if (isInline) {
          // Footnote format (simplified)
          if (authorsList.length === 1) {
            const lastName = authorsList[0].split(' ').pop() || authorsList[0];
            return `(${lastName}, ${year})`;
          } else {
            const lastName = authorsList[0].split(' ').pop() || authorsList[0];
            return `(${lastName} et al., ${year})`;
          }
        } else {
          // Bibliography format
          let formatted = `${authorsList.join(', ')}. "${ref.title}."`;
          
          if (ref.journal) {
            formatted += ` *${ref.journal}*`;
            if (ref.volume) formatted += ` ${ref.volume}`;
            if (ref.issue) formatted += `, no. ${ref.issue}`;
            formatted += ` (${year})`;
            if (ref.pages) formatted += `: ${ref.pages}`;
          } else {
            formatted += ` ${year}`;
          }
          
          if (ref.url) formatted += `. ${ref.url}`;
          if (ref.doi) formatted += `. https://doi.org/${ref.doi}`;
          
          return formatted + '.';
        }
      },
      
      IEEE: (ref: Reference, isInline = false) => {
        if (isInline) {
          // Numbered citation format
          const index = citations.findIndex(c => c === ref) + 1;
          return `[${index}]`;
        } else {
          // Bibliography format
          const authorsFormatted = ref.authors.map(author => {
            const parts = author.trim().split(' ');
            if (parts.length >= 2) {
              const lastName = parts.pop();
              const initials = parts.map(name => name.charAt(0).toUpperCase()).join('. ');
              return `${initials}. ${lastName}`;
            }
            return author;
          });
          
          let formatted = `${authorsFormatted.join(', ')}, "${ref.title},"`;
          
          if (ref.journal) {
            formatted += ` *${ref.journal}*`;
            if (ref.volume) formatted += `, vol. ${ref.volume}`;
            if (ref.issue) formatted += `, no. ${ref.issue}`;
            if (ref.pages) formatted += `, pp. ${ref.pages}`;
            formatted += `, ${ref.year}`;
          } else {
            formatted += ` ${ref.year}`;
          }
          
          if (ref.doi) formatted += `, doi: ${ref.doi}`;
          else if (ref.url) formatted += `. [Online]. Available: ${ref.url}`;
          
          return formatted + '.';
        }
      }
    };
    
    return formatters[style as keyof typeof formatters] || formatters.APA;
  }, [style, citations]);

  // Update citations when style changes
  useEffect(() => {
    setCitations(prev => prev.map(citation => ({
      ...citation,
      citation: formatCitation(citation, false)
    })));
  }, [style, formatCitation]);

  // Sync with parent component
  useEffect(() => {
    if (onCitationStyleChange && style !== citationStyle) {
      onCitationStyleChange(style);
    }
  }, [style, citationStyle, onCitationStyleChange]);

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
    <section data-testid="citation-manager-section" className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Citation Manager</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Style:</label>
            <select 
              data-testid="citation-style-select"
              value={style} 
              onChange={e => setStyle(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="APA">APA 7th</option>
              <option value="MLA">MLA 9th</option>
              <option value="Chicago">Chicago</option>
              <option value="IEEE">IEEE</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Preview:</label>
            <select 
              data-testid="preview-mode-select"
              value={previewMode} 
              onChange={e => setPreviewMode(e.target.value as 'inline' | 'bibliography')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="inline">In-text</option>
              <option value="bibliography">Bibliography</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-time preview panel */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6" data-testid="citation-preview-panel">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {previewMode === 'inline' ? 'In-text Citations Preview' : 'Bibliography Preview'}
        </h3>
        <div className="space-y-2" data-testid="citation-preview-list">
          {citations.length > 0 ? (
            citations.map((citation, i) => (
              <div 
                key={i} 
                data-testid={`citation-preview-${i}`}
                className="p-3 bg-white rounded border text-sm"
              >
                <div className="font-mono text-gray-800">
                  {formatCitation(citation, previewMode === 'inline')}
                </div>
                {previewMode === 'bibliography' && (
                  <div className="mt-2 text-xs text-gray-600">
                    <strong>Source:</strong> {citation.title}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">No citations to preview</div>
          )}
        </div>
      </div>

      {/* Citation list with enhanced editing */}
      <div data-testid="citation-list" className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">References</h3>
        {citations.map((c, i) => (
          <div key={i} data-testid={`reference-${i}`} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">{c.title}</div>
                <div className="text-sm text-gray-600 mb-2">
                  Authors: {c.authors.join(', ')} • Year: {c.year}
                </div>
                <div data-testid={`citation-ref-${i}`} className="font-mono text-sm bg-white p-2 rounded border">
                  {c.citation}
                </div>
              </div>
              <div className="ml-4 flex space-x-2">
                {editingIdx === i ? (
                  <>
                    <button 
                      data-testid={`save-citation-${i}`} 
                      onClick={() => handleSave(i)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setEditingIdx(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      data-testid={`edit-citation-${i}`} 
                      onClick={() => handleEdit(i)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button 
                      data-testid={`remove-reference-${i}`} 
                      onClick={() => handleRemove(i)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                    <button 
                      data-testid={`move-reference-up-${i}`} 
                      onClick={() => handleMoveUp(i)}
                      disabled={i === 0}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingIdx === i && (
              <div className="mt-3">
                <textarea
                  data-testid={`citation-edit-input-${i}`}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full p-2 border rounded font-mono text-sm"
                  rows={3}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new reference */}
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add New Reference</h3>
          <button 
            data-testid="add-reference-btn" 
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showAdd ? 'Cancel' : 'Add Reference'}
          </button>
        </div>
        
        {showAdd && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4" data-testid="add-reference-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input 
                  data-testid="reference-title-input" 
                  placeholder="Article or book title" 
                  value={newRef.title} 
                  onChange={e => setNewRef({ ...newRef, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authors *</label>
                <input 
                  data-testid="reference-authors-input" 
                  placeholder="Author names (comma separated)" 
                  value={newRef.authors.join(', ')} 
                  onChange={e => setNewRef({ ...newRef, authors: e.target.value.split(',').map(a => a.trim()) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input 
                  data-testid="reference-year-input" 
                  type="number"
                  placeholder="Publication year" 
                  value={newRef.year} 
                  onChange={e => setNewRef({ ...newRef, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal (optional)</label>
                <input 
                  data-testid="reference-journal-input" 
                  placeholder="Journal name" 
                  value={newRef.journal || ''} 
                  onChange={e => setNewRef({ ...newRef, journal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DOI (optional)</label>
                <input 
                  data-testid="reference-doi-input" 
                  placeholder="10.1000/xyz123" 
                  value={newRef.doi || ''} 
                  onChange={e => setNewRef({ ...newRef, doi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL (optional)</label>
                <input 
                  data-testid="reference-url-input" 
                  placeholder="https://..." 
                  value={newRef.url || ''} 
                  onChange={e => setNewRef({ ...newRef, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Live preview of new citation */}
            {newRef.title && newRef.authors[0] && (
              <div className="mt-4 p-3 bg-white rounded border">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview:</label>
                <div className="font-mono text-sm text-gray-800">
                  {formatCitation({ ...newRef, citation: '' }, false)}
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button 
                data-testid="save-reference-btn" 
                onClick={() => {
                  if (newRef.title && newRef.authors[0]) {
                    const formattedRef = {
                      ...newRef,
                      citation: formatCitation(newRef, false)
                    };
                    setCitations(prev => [...prev, formattedRef]);
                    setShowAdd(false);
                    setNewRef({ 
                      title: '', 
                      authors: [''], 
                      year: new Date().getFullYear(), 
                      citation: '',
                      url: '',
                      doi: '',
                      journal: '',
                      volume: '',
                      issue: '',
                      pages: ''
                    });
                  }
                }}
                disabled={!newRef.title || !newRef.authors[0]}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Save Reference
              </button>
              <button 
                data-testid="cancel-reference-btn"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export customization section */}
      <div className="mt-6 pt-6 border-t" data-testid="export-customization">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sections to include */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Include Sections</label>
            <div className="space-y-2">
              {['Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion'].map(section => (
                <label key={section} className="flex items-center">
                  <input
                    type="checkbox"
                    data-testid={`section-checkbox-${section}`}
                    checked={selectedSections.includes(section)}
                    onChange={e => setSelectedSections(prev => 
                      e.target.checked 
                        ? [...prev, section] 
                        : prev.filter(s => s !== section)
                    )}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{section}</span>
                </label>
              ))}
            </div>
          </div>

          {/* File format options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  data-testid="file-format-pdf"
                  checked={fileFormat === 'pdf'}
                  onChange={() => setFileFormat('pdf')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">PDF Document</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  data-testid="file-format-word"
                  checked={fileFormat === 'word'}
                  onChange={() => setFileFormat('word')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Word Document (.docx)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Export action */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {citations.length} references • {selectedSections.length} sections • {style} style
          </div>
          <button 
            onClick={handleExport}
            disabled={citations.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Export {fileFormat === 'word' ? 'Word' : 'PDF'} Document
          </button>
        </div>
        
        {exportMsg && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm text-green-800">{exportMsg}</div>
          </div>
        )}
      </div>
    </section>
  );
}; 