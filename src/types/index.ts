// Organization Settings
export interface OrganizationSettings {
  id: string;
  user_id: string;
  partner_label: string;
  partner_label_plural: string;
  workstream_label: string;
  workstream_label_plural: string;
  statuses: StatusConfig[];
  health_scale_max: number;
  slack_update_template: string;
  default_workstreams: DefaultWorkstream[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusConfig {
  value: string;
  label: string;
  color: string;
}

export interface DefaultWorkstream {
  name: string;
  sort_order: number;
}

// Partners
export interface Partner {
  id: string;
  user_id: string;
  name: string;
  status: string;
  target_launch_date: string | null;
  actual_launch_date: string | null;
  health_score: number;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  external_channel: string | null;
  custom_fields: Record<string, any>;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerWithStats extends Partner {
  workstream_count: number;
  workstream_complete: number;
  open_risks: number;
  open_action_items: number;
}

// Workstreams
export type WorkstreamStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export interface Workstream {
  id: string;
  user_id: string;
  partner_id: string;
  name: string;
  status: WorkstreamStatus;
  owner_user_id: string | null;
  owner_external: string | null;
  due_date: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Milestones
export type MilestoneStatus = 'upcoming' | 'complete' | 'missed' | 'skipped';

export interface Milestone {
  id: string;
  user_id: string;
  partner_id: string;
  title: string;
  target_date: string;
  actual_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
  created_at: string;
}

// Risks
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';

export interface Risk {
  id: string;
  user_id: string;
  partner_id: string;
  title: string;
  description: string | null;
  severity: RiskSeverity;
  status: RiskStatus;
  mitigation_plan: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Notes
export type NoteSource = 'manual' | 'grain' | 'fireflies' | 'zoom' | 'teams' | 'other';

export interface ActionItem {
  id: string;
  item: string;
  owner: string;
  due_date: string | null;
  complete: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  partner_id: string;
  title: string;
  meeting_date: string;
  source: NoteSource;
  raw_content: string | null;
  summary: string | null;
  action_items: ActionItem[];
  decisions: string[];
  attendees: string[];
  external_link: string | null;
  created_at: string;
}

// Generated Updates
export type UpdateType = 'slack' | 'email' | 'deck_notes';

export interface GeneratedUpdate {
  id: string;
  user_id: string;
  partner_id: string;
  update_type: UpdateType;
  content: string;
  generated_at: string;
  sent: boolean;
  sent_at: string | null;
}

// Activity Log
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'status_changed'
  | 'health_changed'
  | 'workstream_added'
  | 'workstream_updated'
  | 'workstream_completed'
  | 'risk_added'
  | 'risk_updated'
  | 'risk_closed'
  | 'note_added'
  | 'action_item_completed'
  | 'milestone_added'
  | 'milestone_completed'
  | 'update_generated';

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  partner_id: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_active: number;
  launching_this_month: number;
  at_risk_count: number;
  overdue_action_items: number;
}

// Utility types
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Keep old types for Gantt chart (demo page)
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type TimeScale = 'day' | 'week' | 'month';
