import React, { useState } from 'react';

export const ResearchAssistant = () => {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const handleResearch = () => {
    setResult(`Research result for: ${prompt}`);
  };
  return (
    <section data-testid="research-assistant-section">
      <h2>Research Assistant</h2>
      <input
        data-testid="research-prompt-input"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />
      <button data-testid="research-btn" onClick={handleResearch}>Research</button>
      <div data-testid="research-results">{result}</div>
    </section>
  );
}; 