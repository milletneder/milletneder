'use client';

import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  value: number;
  className?: string;
}

export default function Counter({ value, className = '' }: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value]);

  const formatted = displayValue.toLocaleString('tr-TR');

  return (
    <span className={`tabular-nums font-bold ${className}`}>
      {formatted}
    </span>
  );
}
