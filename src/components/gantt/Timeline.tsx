'use client';

import { useMemo } from 'react';
import { TimeScale } from '@/types';
import { formatTimeUnit, formatTimeUnitHeader, isWeekend, isToday } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TimelineProps {
  timeUnits: Date[];
  timeScale: TimeScale;
  cellWidth: number;
}

export function Timeline({ timeUnits, timeScale, cellWidth }: TimelineProps) {
  // Group time units by month/year for header
  const headerGroups = useMemo(() => {
    const groups: { label: string; startIndex: number; count: number }[] = [];
    let currentLabel = '';
    let currentStartIndex = 0;
    let currentCount = 0;

    timeUnits.forEach((date, index) => {
      const label = formatTimeUnitHeader(date, timeScale);
      if (label !== currentLabel) {
        if (currentCount > 0) {
          groups.push({ label: currentLabel, startIndex: currentStartIndex, count: currentCount });
        }
        currentLabel = label;
        currentStartIndex = index;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    if (currentCount > 0) {
      groups.push({ label: currentLabel, startIndex: currentStartIndex, count: currentCount });
    }

    return groups;
  }, [timeUnits, timeScale]);

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      {/* Header row (Month/Year) */}
      <div className="flex h-6 bg-gray-50 border-b border-gray-100">
        {headerGroups.map((group, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-xs font-medium text-gray-600 border-r border-gray-200"
            style={{ width: group.count * cellWidth }}
          >
            {group.label}
          </div>
        ))}
      </div>

      {/* Day/Week/Month cells */}
      <div className="flex h-6">
        {timeUnits.map((date, i) => {
          const isWeekendDay = timeScale === 'day' && isWeekend(date);
          const isTodayCell = timeScale === 'day' && isToday(date);

          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-center text-xs border-r border-gray-100',
                isWeekendDay && 'bg-gray-50 text-gray-400',
                isTodayCell && 'bg-blue-50 text-blue-600 font-semibold'
              )}
              style={{ width: cellWidth }}
            >
              {timeScale === 'day' && (
                <span className="truncate px-1">
                  {format(date, 'EEE').charAt(0)} {formatTimeUnit(date, timeScale)}
                </span>
              )}
              {timeScale === 'week' && formatTimeUnit(date, timeScale)}
              {timeScale === 'month' && formatTimeUnit(date, timeScale)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
