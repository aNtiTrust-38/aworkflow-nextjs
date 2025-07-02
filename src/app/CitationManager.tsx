import React, { useState } from 'react';

export const CitationManager = () => {
  const [citations, setCitations] = useState<string[]>([]);
  const [style, setStyle] = useState('apa');
  const handleAdd = () => {
    setCitations((prev) => [...prev, `Citation (${style.toUpperCase()})`]);
  };
  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStyle(e.target.value);
    setCitations((prev) => prev.map(() => `Citation (${e.target.value.toUpperCase()})`));
  };
  return (
    <section data-testid="citation-manager-section">
      <h2>Citation Manager</h2>
      <div data-testid="citation-list">
        {citations.map((c, i) => (
          <div key={i}>{c}</div>
        ))}
      </div>
      <button data-testid="add-citation-btn" onClick={handleAdd}>Add Citation</button>
      <select data-testid="citation-style-select" value={style} onChange={handleStyleChange}>
        <option value="apa">APA</option>
        <option value="mla">MLA</option>
        <option value="chicago">Chicago</option>
      </select>
    </section>
  );
}; 