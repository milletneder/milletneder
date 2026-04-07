'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export default function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i === currentStep
                  ? 'bg-primary text-primary-foreground ring-2 ring-ring'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < currentStep ? '\u2713' : i + 1}
            </div>
            {labels && labels[i] && (
              <span className="text-xs text-muted-foreground mt-1 text-center max-w-[80px]">
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
