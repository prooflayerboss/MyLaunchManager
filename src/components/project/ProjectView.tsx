'use client';

import { useState, useCallback } from 'react';
import { Task, Milestone, Dependency, Project } from '@/types';
import { GanttChart } from '@/components/gantt';
import { TaskPanel } from './TaskPanel';
import { Button } from '@/components/ui';
import { Plus, Download, FileSpreadsheet, Image, FileText } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface ProjectViewProps {
  project: Project;
  initialTasks: Task[];
  initialMilestones: Milestone[];
  initialDependencies: Dependency[];
}

export function ProjectView({
  project,
  initialTasks,
  initialMilestones,
  initialDependencies,
}: ProjectViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [milestones] = useState<Milestone[]>(initialMilestones);
  const [dependencies] = useState<Dependency[]>(initialDependencies);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  }, []);

  const handleTaskDelete = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTaskId(null);
  }, []);

  const handleAddTask = useCallback(() => {
    const today = new Date();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      project_id: project.id,
      parent_id: null,
      name: 'New Task',
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      progress: 0,
      color: '#3b82f6',
      assignee_id: null,
      sort_order: tasks.length,
      created_at: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
  }, [project.id, tasks.length]);

  const handleExportPNG = async () => {
    const { exportToPNG } = await import('@/lib/exports/png');
    await exportToPNG('gantt-chart', `${project.name}-gantt.png`);
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    const { exportToPDF } = await import('@/lib/exports/pdf');
    await exportToPDF('gantt-chart', `${project.name}-gantt.pdf`);
    setShowExportMenu(false);
  };

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/exports/excel');
    await exportToExcel(tasks, milestones, `${project.name}-gantt.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <Image className="w-4 h-4 mr-3 text-gray-400" />
                  Export as PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <FileText className="w-4 h-4 mr-3 text-gray-400" />
                  Export as PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-3 text-gray-400" />
                  Export to Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 p-6 bg-gray-50 overflow-hidden" id="gantt-chart">
        <GanttChart
          tasks={tasks}
          milestones={milestones}
          dependencies={dependencies}
          onTaskUpdate={handleTaskUpdate}
          onTaskSelect={task => setSelectedTaskId(task?.id || null)}
          selectedTaskId={selectedTaskId}
          className="h-full"
        />
      </div>

      {/* Task Panel */}
      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
