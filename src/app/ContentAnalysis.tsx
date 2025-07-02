import React, { useState } from 'react';

export const ContentAnalysis = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState('');
  const handleAnalyze = () => {
    if (file) setResult(`Analysis result for: ${file.name}`);
  };
  return (
    <section data-testid="content-analysis-section">
      <h2>Content Analysis</h2>
      <input
        type="file"
        data-testid="content-file-input"
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <button data-testid="analyze-btn" onClick={handleAnalyze}>Analyze</button>
      <div data-testid="analysis-results">{result}</div>
    </section>
  );
}; 