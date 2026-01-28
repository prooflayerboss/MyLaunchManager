'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Task, Milestone, Dependency, TimeScale, TaskWithChildren } from '@/types';
import { Timeline } from './Timeline';
import { GanttRow } from './GanttRow';
import { GanttBar } from './GanttBar';
import { MilestoneMarker } from './MilestoneMarker';
import { DependencyLines } from './DependencyLines';
import { TodayLine } from './TodayLine';
import { getDateRange, getTimeUnits, addDays, differenceInDays, parseISO } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface GanttChartProps {
  tasks: Task[];
  milestones: Milestone[];
  dependencies: Dependency[];
  onTaskUpdate: (task: Task) => void;
  onTaskSelect: (task: Task | null) => void;
  selectedTaskId: string | null;
  className?: string;
}

const CELL_WIDTHS: Record<TimeScale, number> = {
  day: 40,
  week: 80,
  month: 120,
};

const ROW_HEIGHT = 44;
const TASK_LIST_WIDTH = 300;

export function GanttChart({
  tasks,
  milestones,
  dependencies,
  onTaskUpdate,
  onTaskSelect,
  selectedTaskId,
  className,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('day');
  const [viewStartDate, setViewStartDate] = useState(() => {
    const today = new Date();
    return addDays(today, -7);
  });

  const cellWidth = CELL_WIDTHS[timeScale];
  const { start: rangeStart, end: rangeEnd } = getDateRange(viewStartDate, timeScale, 60);
  const timeUnits = getTimeUnits(rangeStart, rangeEnd, timeScale);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    initialTask: Task;
    currentOffset: number;
  } | null>(null);

  // Build task tree for hierarchical display
  const taskTree = useMemo(() => {
    const taskMap = new Map<string, TaskWithChildren>();
    const rootTasks: TaskWithChildren[] = [];

    // First pass: create all task nodes
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [], level: 0 });
    });

    // Second pass: build tree structure
    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        rootTasks.push(node);
      }
    });

    // Flatten tree for display
    const flattenTree = (nodes: TaskWithChildren[]): TaskWithChildren[] => {
      return nodes.flatMap(node => [node, ...flattenTree(node.children)]);
    };

    return flattenTree(rootTasks.sort((a, b) => a.sort_order - b.sort_order));
  }, [tasks]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const [taskId, type] = (active.id as string).split('::');
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setDragState({
        taskId,
        type: type as 'move' | 'resize-start' | 'resize-end',
        initialTask: task,
        currentOffset: 0,
      });
    }
  }, [tasks]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!dragState) return;
    const { delta } = event;
    const dayOffset = Math.round(delta.x / cellWidth);
    setDragState(prev => prev ? { ...prev, currentOffset: dayOffset } : null);
  }, [dragState, cellWidth]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!dragState) return;

    const { delta } = event;
    const dayOffset = Math.round(delta.x / cellWidth);

    if (dayOffset !== 0) {
      const task = dragState.initialTask;
      const startDate = parseISO(task.start_date);
      const endDate = parseISO(task.end_date);

      let newStart: Date;
      let newEnd: Date;

      switch (dragState.type) {
        case 'move':
          newStart = addDays(startDate, dayOffset);
          newEnd = addDays(endDate, dayOffset);
          break;
        case 'resize-start':
          newStart = addDays(startDate, dayOffset);
          newEnd = endDate;
          if (newStart >= newEnd) {
            newStart = addDays(newEnd, -1);
          }
          break;
        case 'resize-end':
          newStart = startDate;
          newEnd = addDays(endDate, dayOffset);
          if (newEnd <= newStart) {
            newEnd = addDays(newStart, 1);
          }
          break;
        default:
          newStart = startDate;
          newEnd = endDate;
      }

      onTaskUpdate({
        ...task,
        start_date: newStart.toISOString().split('T')[0],
        end_date: newEnd.toISOString().split('T')[0],
      });
    }

    setDragState(null);
  }, [dragState, cellWidth, onTaskUpdate]);

  const getPreviewTask = useCallback((task: Task): Task => {
    if (!dragState || dragState.taskId !== task.id) return task;

    const startDate = parseISO(task.start_date);
    const endDate = parseISO(task.end_date);
    const offset = dragState.currentOffset;

    switch (dragState.type) {
      case 'move':
        return {
          ...task,
          start_date: addDays(startDate, offset).toISOString().split('T')[0],
          end_date: addDays(endDate, offset).toISOString().split('T')[0],
        };
      case 'resize-start':
        const newStart = addDays(startDate, offset);
        return {
          ...task,
          start_date: (newStart < endDate ? newStart : addDays(endDate, -1)).toISOString().split('T')[0],
        };
      case 'resize-end':
        const newEnd = addDays(endDate, offset);
        return {
          ...task,
          end_date: (newEnd > startDate ? newEnd : addDays(startDate, 1)).toISOString().split('T')[0],
        };
      default:
        return task;
    }
  }, [dragState]);

  const totalWidth = timeUnits.length * cellWidth;
  const totalHeight = taskTree.length * ROW_HEIGHT;

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['day', 'week', 'month'] as TimeScale[]).map(scale => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  timeScale === scale
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                )}
              >
                {scale.charAt(0).toUpperCase() + scale.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewStartDate(addDays(viewStartDate, timeScale === 'day' ? -7 : timeScale === 'week' ? -28 : -90))}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setViewStartDate(addDays(new Date(), -7))}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setViewStartDate(addDays(viewStartDate, timeScale === 'day' ? 7 : timeScale === 'week' ? 28 : 90))}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Task list */}
        <div className="flex-shrink-0 border-r border-gray-200" style={{ width: TASK_LIST_WIDTH }}>
          <div className="h-12 border-b border-gray-200 bg-gray-50 px-4 flex items-center">
            <span className="text-sm font-semibold text-gray-700">Task Name</span>
          </div>
          <div className="overflow-y-auto" style={{ height: `calc(100% - 48px)` }}>
            {taskTree.map(task => (
              <GanttRow
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onClick={() => onTaskSelect(task)}
                rowHeight={ROW_HEIGHT}
              />
            ))}
          </div>
        </div>

        {/* Timeline area */}
        <div className="flex-1 overflow-auto">
          <Timeline
            timeUnits={timeUnits}
            timeScale={timeScale}
            cellWidth={cellWidth}
          />
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <div
              className="relative"
              style={{ width: totalWidth, height: totalHeight }}
            >
              {/* Grid lines */}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: totalWidth, height: totalHeight }}>
                {/* Vertical lines */}
                {timeUnits.map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * cellWidth}
                    y1={0}
                    x2={i * cellWidth}
                    y2={totalHeight}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                ))}
                {/* Horizontal lines */}
                {taskTree.map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={(i + 1) * ROW_HEIGHT}
                    x2={totalWidth}
                    y2={(i + 1) * ROW_HEIGHT}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                ))}
              </svg>

              {/* Today line */}
              <TodayLine
                viewStart={rangeStart}
                cellWidth={cellWidth}
                timeScale={timeScale}
                height={totalHeight}
              />

              {/* Dependency lines */}
              <DependencyLines
                dependencies={dependencies}
                tasks={taskTree}
                viewStart={rangeStart}
                cellWidth={cellWidth}
                timeScale={timeScale}
                rowHeight={ROW_HEIGHT}
              />

              {/* Task bars */}
              {taskTree.map((task, index) => (
                <GanttBar
                  key={task.id}
                  task={getPreviewTask(task)}
                  rowIndex={index}
                  viewStart={rangeStart}
                  cellWidth={cellWidth}
                  timeScale={timeScale}
                  rowHeight={ROW_HEIGHT}
                  isSelected={selectedTaskId === task.id}
                  isDragging={dragState?.taskId === task.id}
                  onClick={() => onTaskSelect(task)}
                />
              ))}

              {/* Milestones */}
              {milestones.map(milestone => (
                <MilestoneMarker
                  key={milestone.id}
                  milestone={milestone}
                  viewStart={rangeStart}
                  cellWidth={cellWidth}
                  timeScale={timeScale}
                  height={totalHeight}
                />
              ))}
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
