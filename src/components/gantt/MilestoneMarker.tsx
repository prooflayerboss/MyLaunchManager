'use client';

import { Milestone, TimeScale } from '@/types';
import { differenceInDays, differenceInWeeks, differenceInMonths, parseISO } from 'date-fns';

interface MilestoneMarkerProps {
  milestone: Milestone;
  viewStart: Date;
  cellWidth: number;
  timeScale: TimeScale;
  height: number;
}

export function MilestoneMarker({
  milestone,
  viewStart,
  cellWidth,
  timeScale,
  height,
}: MilestoneMarkerProps) {
  const date = parseISO(milestone.date);

  let offset: number;
  switch (timeScale) {
    case 'day':
      offset = differenceInDays(date, viewStart);
      break;
    case 'week':
      offset = differenceInWeeks(date, viewStart);
      break;
    case 'month':
      offset = differenceInMonths(date, viewStart);
      break;
  }

  const left = offset * cellWidth + cellWidth / 2;
  const color = milestone.color || '#f59e0b';

  return (
    <div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{ left: left - 8, top: 0 }}
    >
      {/* Diamond marker */}
      <div
        className="w-4 h-4 rotate-45 shadow-sm"
        style={{ backgroundColor: color }}
      />

      {/* Vertical line */}
      <div
        className="w-px opacity-50"
        style={{ backgroundColor: color, height: height - 16 }}
      />

      {/* Label at bottom */}
      <div
        className="absolute -bottom-6 whitespace-nowrap text-xs font-medium px-2 py-0.5 rounded"
        style={{ backgroundColor: color, color: 'white' }}
      >
        {milestone.name}
      </div>
    </div>
  );
}
