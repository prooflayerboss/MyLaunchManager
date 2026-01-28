'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Download, FileSpreadsheet, Image, FileText, Settings, Trash2 } from 'lucide-react';
import { GanttChart } from '@/components/gantt';
import { TaskPanel } from '@/components/project';
import { Task, Milestone, Dependency, Project } from '@/types';
import { addDays, format } from 'date-fns';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;

  // Fetch project data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!projectData) {
        router.push('/projects');
        return;
      }
      setProject(projectData);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      setTasks(tasksData || []);

      // Fetch milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId);
      setMilestones(milestonesData || []);

      // Fetch dependencies
      const { data: depsData } = await supabase
        .from('dependencies')
        .select('*');
      // Filter to only deps for this project's tasks
      const taskIds = (tasksData || []).map(t => t.id);
      setDependencies((depsData || []).filter(d => taskIds.includes(d.source_task_id)));

      setLoading(false);
    };
    fetchData();
  }, [projectId, router, supabase]);

  const handleTaskUpdate = useCallback(async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    await supabase
      .from('tasks')
      .update({
        name: updatedTask.name,
        start_date: updatedTask.start_date,
        end_date: updatedTask.end_date,
        progress: updatedTask.progress,
        color: updatedTask.color,
      })
      .eq('id', updatedTask.id);
  }, [supabase]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTaskId(null);

    await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
  }, [supabase]);

  const handleAddTask = useCallback(async () => {
    const today = new Date();
    const newTask = {
      project_id: projectId,
      name: 'New Task',
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(addDays(today, 7), 'yyyy-MM-dd'),
      progress: 0,
      color: '#3b82f6',
      sort_order: tasks.length,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (data && !error) {
      setTasks(prev => [...prev, data]);
      setSelectedTaskId(data.id);
    }
  }, [projectId, tasks.length, supabase]);

  const handleExportPNG = async () => {
    const { exportToPNG } = await import('@/lib/exports/png');
    await exportToPNG('gantt-chart', `${project?.name || 'project'}-gantt.png`);
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    const { exportToPDF } = await import('@/lib/exports/pdf');
    await exportToPDF('gantt-chart', `${project?.name || 'project'}-gantt.pdf`);
    setShowExportMenu(false);
  };

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/exports/excel');
    await exportToExcel(tasks, milestones, `${project?.name || 'project'}-gantt.xlsx`);
    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading project...</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-2 z-50"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Image className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  Export as PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  Export as PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  Export to Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 min-h-0" id="gantt-chart">
        {tasks.length === 0 ? (
          <div
            className="h-full rounded-xl flex flex-col items-center justify-center text-center p-8"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Plus className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No tasks yet
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Add your first task to start building your timeline.
            </p>
            <button
              onClick={handleAddTask}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Plus className="w-5 h-5" />
              Add your first task
            </button>
          </div>
        ) : (
          <GanttChart
            tasks={tasks}
            milestones={milestones}
            dependencies={dependencies}
            onTaskUpdate={handleTaskUpdate}
            onTaskSelect={task => setSelectedTaskId(task?.id || null)}
            selectedTaskId={selectedTaskId}
            className="h-full"
          />
        )}
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
