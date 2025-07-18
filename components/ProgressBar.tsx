import React from 'react';

interface ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  testId?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, min = 1, max = 100, label = 'Progress', testId = 'progress-percentage' }) => {
  // Handle edge case where min equals max
  let percent = 0;
  if (min === max) {
    percent = 100;
  } else {
    // Clamp value and round to 2 decimal places
    percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    percent = Math.round(percent * 100) / 100; // Round to 2 decimal places
  }
  return (
    <div
      className="w-full bg-gray-200 rounded-full h-2"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={label}
      data-testid="progress-bar"
    >
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percent}%` }}
        data-testid={testId}
      />
    </div>
  );
};

export default ProgressBar; 