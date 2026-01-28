import {
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  endOfWeek,
  endOfMonth,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWeekend,
  isSameDay,
  parseISO,
} from 'date-fns';
import type { TimeScale } from '@/types';

export function getDateRange(centerDate: Date, scale: TimeScale, cellCount: number = 30) {
  const halfCount = Math.floor(cellCount / 2);

  switch (scale) {
    case 'day':
      return {
        start: addDays(startOfDay(centerDate), -halfCount),
        end: addDays(endOfDay(centerDate), halfCount),
      };
    case 'week':
      return {
        start: addWeeks(startOfWeek(centerDate), -halfCount),
        end: addWeeks(endOfWeek(centerDate), halfCount),
      };
    case 'month':
      return {
        start: addMonths(startOfMonth(centerDate), -halfCount),
        end: addMonths(endOfMonth(centerDate), halfCount),
      };
  }
}

export function getTimeUnits(start: Date, end: Date, scale: TimeScale) {
  switch (scale) {
    case 'day':
      return eachDayOfInterval({ start, end });
    case 'week':
      return eachWeekOfInterval({ start, end });
    case 'month':
      return eachMonthOfInterval({ start, end });
  }
}

export function formatTimeUnit(date: Date, scale: TimeScale): string {
  switch (scale) {
    case 'day':
      return format(date, 'd');
    case 'week':
      return format(date, "'W'w");
    case 'month':
      return format(date, 'MMM');
  }
}

export function formatTimeUnitHeader(date: Date, scale: TimeScale): string {
  switch (scale) {
    case 'day':
      return format(date, 'MMMM yyyy');
    case 'week':
      return format(date, 'MMMM yyyy');
    case 'month':
      return format(date, 'yyyy');
  }
}

export function getTaskPosition(
  taskStart: Date | string,
  taskEnd: Date | string,
  viewStart: Date,
  cellWidth: number,
  scale: TimeScale
): { left: number; width: number } {
  const start = typeof taskStart === 'string' ? parseISO(taskStart) : taskStart;
  const end = typeof taskEnd === 'string' ? parseISO(taskEnd) : taskEnd;

  let startOffset: number;
  let duration: number;

  switch (scale) {
    case 'day':
      startOffset = differenceInDays(start, viewStart);
      duration = differenceInDays(end, start) + 1;
      break;
    case 'week':
      startOffset = differenceInWeeks(start, viewStart);
      duration = Math.max(1, differenceInWeeks(end, start) + 1);
      break;
    case 'month':
      startOffset = differenceInMonths(start, viewStart);
      duration = Math.max(1, differenceInMonths(end, start) + 1);
      break;
  }

  return {
    left: startOffset * cellWidth,
    width: duration * cellWidth,
  };
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export { isWeekend, format, parseISO, addDays, differenceInDays };
