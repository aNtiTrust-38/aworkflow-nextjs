import React, { useState } from 'react';

interface ADHDFriendlyGoalsProps {
  prompt: string;
  onGoalsGenerated: (goals: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
}

export const ADHDFriendlyGoals: React.FC<ADHDFriendlyGoalsProps> = ({ prompt, onGoalsGenerated, onLoading, onError }) => {
  const goals = [
    'Break assignment into small steps',
    'Set a timer for focused work',
    'Take a short break after each step'
  ];
  const [completed, setCompleted] = useState<boolean[]>(goals.map(() => false));
  const handleComplete = (i: number) => {
    setCompleted((prev) => prev.map((c, idx) => (idx === i ? true : c)));
  };
  return (
    <section data-testid="adhd-goals-section">
      <h2>ADHD-Friendly Goals</h2>
      <ul>
        {goals.map((goal, i) => (
          <li
            key={i}
            data-testid="adhd-goal"
            className={completed[i] ? 'completed-goal' : ''}
          >
            {goal}
            <button
              data-testid={`adhd-goal-complete-${i}`}
              onClick={() => handleComplete(i)}
              disabled={completed[i]}
            >
              Complete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}; 