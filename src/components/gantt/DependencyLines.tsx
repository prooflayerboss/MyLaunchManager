'use client';

import { useMemo } from 'react';
import { Dependency, TaskWithChildren, TimeScale } from '@/types';
import { getTaskPosition } from '@/lib/utils';

interface DependencyLinesProps {
  dependencies: Dependency[];
  tasks: TaskWithChildren[];
  viewStart: Date;
  cellWidth: number;
  timeScale: TimeScale;
  rowHeight: number;
}

export function DependencyLines({
  dependencies,
  tasks,
  viewStart,
  cellWidth,
  timeScale,
  rowHeight,
}: DependencyLinesProps) {
  const lines = useMemo(() => {
    return dependencies.map(dep => {
      const sourceIndex = tasks.findIndex(t => t.id === dep.source_task_id);
      const targetIndex = tasks.findIndex(t => t.id === dep.target_task_id);

      if (sourceIndex === -1 || targetIndex === -1) return null;

      const sourceTask = tasks[sourceIndex];
      const targetTask = tasks[targetIndex];

      const sourcePos = getTaskPosition(sourceTask.start_date, sourceTask.end_date, viewStart, cellWidth, timeScale);
      const targetPos = getTaskPosition(targetTask.start_date, targetTask.end_date, viewStart, cellWidth, timeScale);

      const barHeight = 28;
      const topOffset = (rowHeight - barHeight) / 2;

      // Calculate connection points based on dependency type
      let startX: number, startY: number, endX: number, endY: number;

      switch (dep.type) {
        case 'finish_to_start':
          startX = sourcePos.left + sourcePos.width;
          startY = sourceIndex * rowHeight + topOffset + barHeight / 2;
          endX = targetPos.left;
          endY = targetIndex * rowHeight + topOffset + barHeight / 2;
          break;
        case 'start_to_start':
          startX = sourcePos.left;
          startY = sourceIndex * rowHeight + topOffset + barHeight / 2;
          endX = targetPos.left;
          endY = targetIndex * rowHeight + topOffset + barHeight / 2;
          break;
        case 'finish_to_finish':
          startX = sourcePos.left + sourcePos.width;
          startY = sourceIndex * rowHeight + topOffset + barHeight / 2;
          endX = targetPos.left + targetPos.width;
          endY = targetIndex * rowHeight + topOffset + barHeight / 2;
          break;
        case 'start_to_finish':
          startX = sourcePos.left;
          startY = sourceIndex * rowHeight + topOffset + barHeight / 2;
          endX = targetPos.left + targetPos.width;
          endY = targetIndex * rowHeight + topOffset + barHeight / 2;
          break;
        default:
          return null;
      }

      // Create a path with rounded corners
      const midX = startX + 15;
      const path = `
        M ${startX} ${startY}
        L ${midX} ${startY}
        Q ${midX + 5} ${startY} ${midX + 5} ${startY + (endY > startY ? 5 : -5)}
        L ${midX + 5} ${endY + (endY > startY ? -5 : 5)}
        Q ${midX + 5} ${endY} ${midX + 10} ${endY}
        L ${endX - 6} ${endY}
      `;

      return {
        id: dep.id,
        path,
        endX: endX - 6,
        endY,
      };
    }).filter(Boolean);
  }, [dependencies, tasks, viewStart, cellWidth, timeScale, rowHeight]);

  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#9ca3af" />
        </marker>
      </defs>
      {lines.map(line => line && (
        <path
          key={line.id}
          d={line.path}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1.5}
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}
