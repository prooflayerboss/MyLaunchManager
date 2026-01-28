export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  defaultView?: 'gantt' | 'list';
  timeScale?: 'day' | 'week' | 'month';
  showWeekends?: boolean;
  workingHours?: { start: number; end: number };
}

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  color: string | null;
  assignee_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface TaskWithChildren extends Task {
  children: TaskWithChildren[];
  level: number;
}

export interface Dependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  date: string;
  color: string | null;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export type TimeScale = 'day' | 'week' | 'month';

export interface GanttViewState {
  startDate: Date;
  endDate: Date;
  timeScale: TimeScale;
  cellWidth: number;
}
