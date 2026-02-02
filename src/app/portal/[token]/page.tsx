'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Partner, Workstream, Milestone, ProjectTask } from '@/types';
import {
  CheckCircle2, Clock, AlertTriangle, Calendar, Target,
  BarChart3, ChevronRight, Lock
} from 'lucide-react';
import { format, differenceInDays, parseISO, eachWeekOfInterval } from 'date-fns';

interface PortalData {
  partner: Partner;
  workstreams: Workstream[];
  milestones: Milestone[];
  projectTasks: ProjectTask[];
  portalSettings: {
    can_view_timeline: boolean;
    can_view_workstreams: boolean;
    can_view_milestones: boolean;
    can_view_project_plan: boolean;
    custom_logo_url: string | null;
    custom_message: string | null;
  };
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'tasks'>('overview');

  const supabase = createClient();

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        // Fetch portal access record
        const { data: portalAccess, error: portalError } = await supabase
          .from('portal_access')
          .select('*, partner:partners(*)')
          .eq('access_token', token)
          .eq('enabled', true)
          .single();

        if (portalError || !portalAccess) {
          setError('This portal link is invalid or has been disabled.');
          setLoading(false);
          return;
        }

        const partnerId = portalAccess.partner_id;

        // Fetch related data based on permissions
        const [workstreamsRes, milestonesRes, tasksRes] = await Promise.all([
          portalAccess.can_view_workstreams
            ? supabase.from('workstreams').select('*').eq('partner_id', partnerId).order('sort_order')
            : Promise.resolve({ data: [] }),
          portalAccess.can_view_milestones
            ? supabase.from('milestones').select('*').eq('partner_id', partnerId).order('target_date')
            : Promise.resolve({ data: [] }),
          portalAccess.can_view_project_plan
            ? supabase.from('project_tasks').select('*').eq('partner_id', partnerId).order('sort_order')
            : Promise.resolve({ data: [] }),
        ]);

        // Update access count
        await supabase
          .from('portal_access')
          .update({
            last_accessed_at: new Date().toISOString(),
            access_count: (portalAccess.access_count || 0) + 1,
          })
          .eq('id', portalAccess.id);

        setData({
          partner: portalAccess.partner,
          workstreams: workstreamsRes.data || [],
          milestones: milestonesRes.data || [],
          projectTasks: tasksRes.data || [],
          portalSettings: {
            can_view_timeline: portalAccess.can_view_timeline,
            can_view_workstreams: portalAccess.can_view_workstreams,
            can_view_milestones: portalAccess.can_view_milestones,
            can_view_project_plan: portalAccess.can_view_project_plan,
            custom_logo_url: portalAccess.custom_logo_url,
            custom_message: portalAccess.custom_message,
          },
        });
      } catch (err) {
        setError('Failed to load portal data.');
      }
      setLoading(false);
    };

    fetchPortalData();
  }, [token, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Access Denied
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {error || 'This portal is not available.'}
          </p>
        </div>
      </div>
    );
  }

  const { partner, workstreams, milestones, projectTasks, portalSettings } = data;

  // Calculate stats
  const completedWorkstreams = workstreams.filter(w => w.status === 'complete').length;
  const completedMilestones = milestones.filter(m => m.status === 'complete').length;
  const completedTasks = projectTasks.filter(t => t.status === 'complete').length;
  const daysUntilLaunch = partner.target_launch_date
    ? differenceInDays(new Date(partner.target_launch_date), new Date())
    : null;

  const STATUS_COLORS: Record<string, string> = {
    complete: '#22C55E',
    in_progress: '#3B82F6',
    blocked: '#EF4444',
    not_started: '#6B7280',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              {portalSettings.custom_logo_url ? (
                <img src={portalSettings.custom_logo_url} alt="Logo" className="h-8" />
              ) : (
                <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {partner.name}
                </h1>
              )}
            </div>
            {daysUntilLaunch !== null && daysUntilLaunch >= 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {daysUntilLaunch === 0 ? 'Launching today!' : `${daysUntilLaunch} days to launch`}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Custom Message */}
        {portalSettings.custom_message && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <p className="text-sm">{portalSettings.custom_message}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {portalSettings.can_view_workstreams && (
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Workstreams"
              value={`${completedWorkstreams}/${workstreams.length}`}
              color="#3B82F6"
            />
          )}
          {portalSettings.can_view_milestones && (
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              label="Milestones"
              value={`${completedMilestones}/${milestones.length}`}
              color="#22C55E"
            />
          )}
          {portalSettings.can_view_project_plan && (
            <StatCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Tasks"
              value={`${completedTasks}/${projectTasks.length}`}
              color="#8B5CF6"
            />
          )}
          {partner.target_launch_date && (
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              label="Launch Date"
              value={format(new Date(partner.target_launch_date), 'MMM d')}
              color="#F59E0B"
            />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          {portalSettings.can_view_timeline && (
            <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')}>
              Timeline
            </TabButton>
          )}
          {portalSettings.can_view_project_plan && projectTasks.length > 0 && (
            <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>
              Project Plan
            </TabButton>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Workstreams */}
            {portalSettings.can_view_workstreams && workstreams.length > 0 && (
              <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Workstreams
                </h2>
                <div className="space-y-3">
                  {workstreams.map((ws) => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: STATUS_COLORS[ws.status] || STATUS_COLORS.not_started }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>{ws.name}</span>
                      </div>
                      <span className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>
                        {ws.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {portalSettings.can_view_milestones && milestones.length > 0 && (
              <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Key Milestones
                </h2>
                <div className="space-y-3">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center gap-3">
                        {m.status === 'complete' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : m.status === 'missed' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span style={{ color: 'var(--text-primary)' }}>{m.title}</span>
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {format(new Date(m.target_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && portalSettings.can_view_timeline && (
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Project Timeline
            </h2>
            {/* Simple timeline view */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: 'var(--border)' }} />
              <div className="space-y-6">
                {milestones.map((m, i) => (
                  <div key={m.id} className="relative pl-10">
                    <div
                      className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${m.status === 'complete' ? 'bg-green-500' : ''}`}
                      style={{ background: m.status === 'complete' ? '#22C55E' : 'var(--bg-secondary)', border: '2px solid var(--border)' }}
                    >
                      {m.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.title}</span>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          {format(new Date(m.target_date), 'MMM d')}
                        </span>
                      </div>
                      <span className="text-xs capitalize px-2 py-0.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && portalSettings.can_view_project_plan && (
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Project Tasks
            </h2>
            <div className="space-y-2">
              {projectTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: STATUS_COLORS[task.status] || STATUS_COLORS.not_started }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{task.name}</span>
                    {task.phase && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                        {task.phase}
                      </span>
                    )}
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {task.end_date && format(new Date(task.end_date), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Powered by LaunchPad
        </p>
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? '' : 'hover:opacity-80'}`}
      style={{
        background: active ? 'var(--accent)' : 'var(--bg-primary)',
        color: active ? 'white' : 'var(--text-secondary)',
        border: active ? 'none' : '1px solid var(--border)',
      }}
    >
      {children}
    </button>
  );
}
