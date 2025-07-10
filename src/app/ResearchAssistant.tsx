import React, { useState } from 'react';

interface ResearchAssistantProps {
  prompt: string;
  goals: string;
  onResearchComplete: (results: any) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

export const ResearchAssistant: React.FC<ResearchAssistantProps> = ({ prompt, goals, onResearchComplete, onLoading, onError }) => {
  const [researchQuery, setResearchQuery] = useState('');
  const [result, setResult] = useState('');
  const handleResearch = () => {
    setResult(`Research result for: ${researchQuery}`);
  };
  return (
    <section data-testid="research-assistant-section">
      <h2>Research Assistant</h2>
      <input
        data-testid="research-prompt-input"
        value={researchQuery}
        onChange={e => setResearchQuery(e.target.value)}
      />
      <button data-testid="research-btn" onClick={handleResearch}>Research</button>
      <div data-testid="research-results">{result}</div>
    </section>
  );
}; 