'use client';

import { TimeScale } from '@/types';
import { differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';

interface TodayLineProps {
  viewStart: Date;
  cellWidth: number;
  timeScale: TimeScale;
  height: number;
}

export function TodayLine({ viewStart, cellWidth, timeScale, height }: TodayLineProps) {
  const today = new Date();

  let offset: number;
  switch (timeScale) {
    case 'day':
      offset = differenceInDays(today, viewStart);
      break;
    case 'week':
      offset = differenceInWeeks(today, viewStart);
      break;
    case 'month':
      offset = differenceInMonths(today, viewStart);
      break;
  }

  const left = offset * cellWidth + cellWidth / 2;

  if (left < 0) return null;

  return (
    <div
      className="absolute top-0 w-0.5 bg-red-500 pointer-events-none z-10"
      style={{ left, height }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
    </div>
  );
}
