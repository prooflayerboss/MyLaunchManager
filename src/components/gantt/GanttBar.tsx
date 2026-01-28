'use client';

import { useDraggable } from '@dnd-kit/core';
import { Task, TimeScale } from '@/types';
import { getTaskPosition } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface GanttBarProps {
  task: Task;
  rowIndex: number;
  viewStart: Date;
  cellWidth: number;
  timeScale: TimeScale;
  rowHeight: number;
  isSelected: boolean;
  isDragging: boolean;
  onClick: () => void;
}

export function GanttBar({
  task,
  rowIndex,
  viewStart,
  cellWidth,
  timeScale,
  rowHeight,
  isSelected,
  isDragging,
  onClick,
}: GanttBarProps) {
  const { left, width } = getTaskPosition(task.start_date, task.end_date, viewStart, cellWidth, timeScale);

  // Drag handles for move, resize-start, resize-end
  const moveHandle = useDraggable({ id: `${task.id}::move` });
  const resizeStartHandle = useDraggable({ id: `${task.id}::resize-start` });
  const resizeEndHandle = useDraggable({ id: `${task.id}::resize-end` });

  const barHeight = 28;
  const topOffset = (rowHeight - barHeight) / 2;

  const progressWidth = (width - 4) * (task.progress / 100);
  const color = task.color || '#3b82f6';

  return (
    <div
      ref={moveHandle.setNodeRef}
      {...moveHandle.listeners}
      {...moveHandle.attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'absolute rounded-md cursor-grab transition-shadow',
        isDragging && 'opacity-50 cursor-grabbing',
        isSelected && 'ring-2 ring-blue-400 ring-offset-1'
      )}
      style={{
        left,
        top: rowIndex * rowHeight + topOffset,
        width: Math.max(width, 20),
        height: barHeight,
        backgroundColor: color,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      }}
    >
      {/* Progress fill */}
      {task.progress > 0 && (
        <div
          className="absolute left-0.5 top-0.5 bottom-0.5 rounded-sm opacity-30"
          style={{
            width: progressWidth,
            backgroundColor: '#000',
          }}
        />
      )}

      {/* Task name */}
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <span className="text-xs font-medium text-white truncate drop-shadow-sm">
          {width > 60 ? task.name : ''}
        </span>
      </div>

      {/* Progress percentage */}
      {task.progress > 0 && width > 40 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <span className="text-[10px] font-semibold text-white/80">
            {task.progress}%
          </span>
        </div>
      )}

      {/* Resize handles */}
      <div
        ref={resizeStartHandle.setNodeRef}
        {...resizeStartHandle.listeners}
        {...resizeStartHandle.attributes}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-l-md"
        onClick={e => e.stopPropagation()}
      />
      <div
        ref={resizeEndHandle.setNodeRef}
        {...resizeEndHandle.listeners}
        {...resizeEndHandle.attributes}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-r-md"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
