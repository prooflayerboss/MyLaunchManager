'use client';

import { TaskWithChildren } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface GanttRowProps {
  task: TaskWithChildren;
  isSelected: boolean;
  onClick: () => void;
  rowHeight: number;
}

export function GanttRow({ task, isSelected, onClick, rowHeight }: GanttRowProps) {
  const hasChildren = task.children.length > 0;
  const indent = task.level * 20;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center px-4 border-b border-gray-100 cursor-pointer transition-colors',
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      )}
      style={{ height: rowHeight }}
    >
      <div className="flex items-center flex-1 min-w-0" style={{ paddingLeft: indent }}>
        {hasChildren && (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
        )}
        {!hasChildren && task.level > 0 && (
          <div className="w-4 h-4 flex-shrink-0 mr-1" />
        )}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mr-2"
          style={{ backgroundColor: task.color || '#3b82f6' }}
        />
        <span className={cn(
          'text-sm truncate',
          isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
        )}>
          {task.name}
        </span>
      </div>
    </div>
  );
}
