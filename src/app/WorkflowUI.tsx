import React from 'react';

const WorkflowUI: React.FC = () => {
  return (
    <div>
      <div data-testid="workflow-stepper">Step 1 of 3</div>
      <label htmlFor="prompt">Assignment Prompt</label>
      <textarea id="prompt" aria-label="Assignment Prompt" />
      <button type="button" disabled>Previous</button>
      <button type="button">Next</button>
    </div>
  );
};

export default WorkflowUI; 