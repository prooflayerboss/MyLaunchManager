// =====================================================
// TEAMS & MULTI-USER
// =====================================================

export interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  settings: Record<string, any>;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  plan_seats: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TeamMemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TeamMemberStatus = 'pending' | 'active' | 'suspended';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  status: TeamMemberStatus;
  // Joined data
  user?: User;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: TeamMemberRole;
  invited_by: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// =====================================================
// TEMPLATES
// =====================================================

export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export type TemplateType = 'project_plan' | 'workstreams' | 'milestones' | 'full_setup';

export interface Template {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  template_type: TemplateType;
  is_system: boolean;
  is_public: boolean;
  created_by: string | null;
  team_id: string | null;
  use_count: number;
  preview_image_url: string | null;
  data: TemplateData;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: TemplateCategory;
}

export interface TemplateData {
  workstreams?: { name: string; sort_order: number }[];
  milestones?: { title: string; days_from_start: number }[];
  statuses?: StatusConfig[];
  project_tasks?: Partial<ProjectTask>[];
}

// =====================================================
// COMMENTS
// =====================================================

export type CommentEntityType = 'partner' | 'workstream' | 'milestone' | 'risk' | 'note' | 'project_task';

export interface Comment {
  id: string;
  team_id: string | null;
  user_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  mentions: string[];
  parent_id: string | null;
  edited_at: string | null;
  created_at: string;
  // Joined data
  user?: User;
  replies?: Comment[];
}

// =====================================================
// ACTIVITY LOG
// =====================================================

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
  | 'update_generated'
  | 'comment_added'
  | 'member_invited'
  | 'member_joined'
  | 'member_removed'
  | 'template_applied'
  | 'portal_enabled'
  | 'integration_connected';

export interface ActivityLogEntry {
  id: string;
  team_id: string | null;
  user_id: string;
  partner_id: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  user?: User;
  partner?: Partner;
}

// =====================================================
// TAGS
// =====================================================

export interface Tag {
  id: string;
  team_id: string | null;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PartnerTag {
  partner_id: string;
  tag_id: string;
  created_at: string;
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export type NotificationType =
  | 'mention'
  | 'comment'
  | 'assignment'
  | 'due_date'
  | 'status_change'
  | 'risk_alert'
  | 'team_invite'
  | 'milestone_reminder'
  | 'health_change'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  team_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  read_at: string | null;
  archived_at: string | null;
  data: Record<string, any>;
  created_at: string;
}

// =====================================================
// CUSTOM FIELDS
// =====================================================

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'currency';

export type CustomFieldEntityType = 'partner' | 'workstream' | 'risk' | 'note';

export interface CustomFieldDefinition {
  id: string;
  team_id: string | null;
  user_id: string;
  name: string;
  slug: string;
  field_type: CustomFieldType;
  options: { label: string; value: string; color?: string }[];
  required: boolean;
  show_in_list: boolean;
  show_in_card: boolean;
  sort_order: number;
  entity_type: CustomFieldEntityType;
  created_at: string;
  updated_at: string;
}

// =====================================================
// API KEYS
// =====================================================

export interface ApiKey {
  id: string;
  team_id: string | null;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  use_count: number;
  rate_limit: number;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// =====================================================
// CLIENT PORTAL
// =====================================================

export interface PortalAccess {
  id: string;
  partner_id: string;
  enabled: boolean;
  access_token: string;
  can_view_timeline: boolean;
  can_view_workstreams: boolean;
  can_view_milestones: boolean;
  can_view_project_plan: boolean;
  can_add_comments: boolean;
  allowed_emails: string[];
  custom_logo_url: string | null;
  custom_message: string | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// INTEGRATIONS
// =====================================================

export type IntegrationProvider =
  | 'slack'
  | 'google_calendar'
  | 'outlook'
  | 'salesforce'
  | 'hubspot'
  | 'jira'
  | 'linear'
  | 'zapier';

export type IntegrationStatus = 'active' | 'error' | 'disconnected';

export interface Integration {
  id: string;
  team_id: string | null;
  user_id: string;
  provider: IntegrationProvider;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  settings: Record<string, any>;
  webhook_url: string | null;
  connected_at: string;
  last_sync_at: string | null;
  status: IntegrationStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// USAGE & BILLING
// =====================================================

export type UsageType = 'ai_generation' | 'export' | 'api_call' | 'storage';

export interface UsageRecord {
  id: string;
  team_id: string | null;
  user_id: string | null;
  usage_type: UsageType;
  quantity: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, any>;
  created_at: string;
}

// =====================================================
// ORGANIZATION SETTINGS
// =====================================================

export interface OrganizationSettings {
  id: string;
  user_id: string;
  team_id: string | null;
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

// =====================================================
// PARTNERS
// =====================================================

export interface Partner {
  id: string;
  user_id: string;
  team_id: string | null;
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
  // Joined data
  tags?: Tag[];
  portal_access?: PortalAccess;
}

export interface PartnerWithStats extends Partner {
  workstream_count: number;
  workstream_complete: number;
  open_risks: number;
  open_action_items: number;
}

// =====================================================
// WORKSTREAMS
// =====================================================

export type WorkstreamStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export interface Workstream {
  id: string;
  user_id: string;
  team_id: string | null;
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
  // Joined data
  owner?: User;
}

// =====================================================
// MILESTONES
// =====================================================

export type MilestoneStatus = 'upcoming' | 'complete' | 'missed' | 'skipped';

export interface Milestone {
  id: string;
  user_id: string;
  team_id: string | null;
  partner_id: string;
  title: string;
  target_date: string;
  actual_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
  created_at: string;
}

// =====================================================
// RISKS
// =====================================================

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';

export interface Risk {
  id: string;
  user_id: string;
  team_id: string | null;
  partner_id: string;
  title: string;
  description: string | null;
  severity: RiskSeverity;
  status: RiskStatus;
  mitigation_plan: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: User;
}

// =====================================================
// NOTES
// =====================================================

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
  team_id: string | null;
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

// =====================================================
// PROJECT TASKS
// =====================================================

export type ProjectTaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export interface ProjectTask {
  id: string;
  partner_id: string;
  team_id: string | null;
  task_id: string;
  phase: string;
  name: string;
  description: string | null;
  owner: string | null;
  start_date: string;
  end_date: string;
  status: ProjectTaskStatus;
  dependencies: string[];
  notes: string | null;
  sort_order: number;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  next_occurrence: string | null;
  parent_task_id: string | null;
  created_at: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  end_date?: string;
  occurrences?: number;
}

export interface ProjectTaskGroup {
  phase: string;
  tasks: ProjectTask[];
}

// =====================================================
// GENERATED UPDATES
// =====================================================

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

// =====================================================
// DASHBOARD
// =====================================================

export interface DashboardStats {
  total_active: number;
  launching_this_month: number;
  at_risk_count: number;
  overdue_action_items: number;
}

export interface PortfolioMetrics {
  total_partners: number;
  active_partners: number;
  at_risk_partners: number;
  avg_health_score: number;
  launching_this_month: number;
  launched_this_month: number;
  workstream_completion_rate: number;
  open_risks_count: number;
  overdue_milestones: number;
}

// =====================================================
// USER
// =====================================================

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// =====================================================
// LEGACY TYPES (for Gantt chart demo)
// =====================================================

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
