'use client';

import { ProjectView } from '@/components/project';
import { Task, Milestone, Dependency, Project } from '@/types';
import { addDays, format, subDays } from 'date-fns';
import Link from 'next/link';
import { Rocket, ArrowLeft } from 'lucide-react';

// Sample data for demo
const today = new Date();

const sampleProject: Project = {
  id: 'demo-project',
  name: 'Q1 Product Launch',
  description: 'New feature rollout for enterprise customers',
  owner_id: 'demo-user',
  settings: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const sampleTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'demo-project',
    parent_id: null,
    name: 'Planning & Discovery',
    start_date: format(subDays(today, 14), 'yyyy-MM-dd'),
    end_date: format(subDays(today, 7), 'yyyy-MM-dd'),
    progress: 100,
    color: '#3b82f6',
    assignee_id: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-1-1',
    project_id: 'demo-project',
    parent_id: 'task-1',
    name: 'Requirements gathering',
    start_date: format(subDays(today, 14), 'yyyy-MM-dd'),
    end_date: format(subDays(today, 11), 'yyyy-MM-dd'),
    progress: 100,
    color: '#60a5fa',
    assignee_id: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-1-2',
    project_id: 'demo-project',
    parent_id: 'task-1',
    name: 'Technical design review',
    start_date: format(subDays(today, 10), 'yyyy-MM-dd'),
    end_date: format(subDays(today, 7), 'yyyy-MM-dd'),
    progress: 100,
    color: '#60a5fa',
    assignee_id: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    project_id: 'demo-project',
    parent_id: null,
    name: 'Development Sprint',
    start_date: format(subDays(today, 6), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 7), 'yyyy-MM-dd'),
    progress: 65,
    color: '#10b981',
    assignee_id: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-2-1',
    project_id: 'demo-project',
    parent_id: 'task-2',
    name: 'Backend API development',
    start_date: format(subDays(today, 6), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 2), 'yyyy-MM-dd'),
    progress: 80,
    color: '#34d399',
    assignee_id: null,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-2-2',
    project_id: 'demo-project',
    parent_id: 'task-2',
    name: 'Frontend implementation',
    start_date: format(subDays(today, 4), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 5), 'yyyy-MM-dd'),
    progress: 50,
    color: '#34d399',
    assignee_id: null,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-2-3',
    project_id: 'demo-project',
    parent_id: 'task-2',
    name: 'Database migrations',
    start_date: format(subDays(today, 2), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 1), 'yyyy-MM-dd'),
    progress: 40,
    color: '#34d399',
    assignee_id: null,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-3',
    project_id: 'demo-project',
    parent_id: null,
    name: 'QA & Testing',
    start_date: format(addDays(today, 5), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 12), 'yyyy-MM-dd'),
    progress: 0,
    color: '#f59e0b',
    assignee_id: null,
    sort_order: 7,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-3-1',
    project_id: 'demo-project',
    parent_id: 'task-3',
    name: 'Integration testing',
    start_date: format(addDays(today, 5), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 9), 'yyyy-MM-dd'),
    progress: 0,
    color: '#fbbf24',
    assignee_id: null,
    sort_order: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-3-2',
    project_id: 'demo-project',
    parent_id: 'task-3',
    name: 'UAT sign-off',
    start_date: format(addDays(today, 9), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 12), 'yyyy-MM-dd'),
    progress: 0,
    color: '#fbbf24',
    assignee_id: null,
    sort_order: 9,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-4',
    project_id: 'demo-project',
    parent_id: null,
    name: 'Deployment & Launch',
    start_date: format(addDays(today, 13), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 17), 'yyyy-MM-dd'),
    progress: 0,
    color: '#8b5cf6',
    assignee_id: null,
    sort_order: 10,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-4-1',
    project_id: 'demo-project',
    parent_id: 'task-4',
    name: 'Staging deployment',
    start_date: format(addDays(today, 13), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 14), 'yyyy-MM-dd'),
    progress: 0,
    color: '#a78bfa',
    assignee_id: null,
    sort_order: 11,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-4-2',
    project_id: 'demo-project',
    parent_id: 'task-4',
    name: 'Production rollout',
    start_date: format(addDays(today, 15), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 16), 'yyyy-MM-dd'),
    progress: 0,
    color: '#a78bfa',
    assignee_id: null,
    sort_order: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'task-4-3',
    project_id: 'demo-project',
    parent_id: 'task-4',
    name: 'Post-launch monitoring',
    start_date: format(addDays(today, 16), 'yyyy-MM-dd'),
    end_date: format(addDays(today, 17), 'yyyy-MM-dd'),
    progress: 0,
    color: '#a78bfa',
    assignee_id: null,
    sort_order: 13,
    created_at: new Date().toISOString(),
  },
];

const sampleMilestones: Milestone[] = [
  {
    id: 'milestone-1',
    project_id: 'demo-project',
    name: 'Design Complete',
    date: format(subDays(today, 7), 'yyyy-MM-dd'),
    color: '#3b82f6',
  },
  {
    id: 'milestone-2',
    project_id: 'demo-project',
    name: 'Code Freeze',
    date: format(addDays(today, 8), 'yyyy-MM-dd'),
    color: '#10b981',
  },
  {
    id: 'milestone-3',
    project_id: 'demo-project',
    name: 'Go Live',
    date: format(addDays(today, 16), 'yyyy-MM-dd'),
    color: '#8b5cf6',
  },
];

const sampleDependencies: Dependency[] = [
  {
    id: 'dep-1',
    source_task_id: 'task-1',
    target_task_id: 'task-2',
    type: 'finish_to_start',
  },
  {
    id: 'dep-2',
    source_task_id: 'task-2',
    target_task_id: 'task-3',
    type: 'finish_to_start',
  },
  {
    id: 'dep-3',
    source_task_id: 'task-3',
    target_task_id: 'task-4',
    type: 'finish_to_start',
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Demo Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">My Launch Manager</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
            Demo Mode
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <ProjectView
          project={sampleProject}
          initialTasks={sampleTasks}
          initialMilestones={sampleMilestones}
          initialDependencies={sampleDependencies}
        />
      </main>
    </div>
  );
}
