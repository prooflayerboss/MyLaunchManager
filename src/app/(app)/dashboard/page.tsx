'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSettings, getHealthColor, getHealthWord } from '@/hooks/useSettings';
import {
  Plus, Rocket, AlertTriangle, Calendar, CheckCircle2,
  ArrowRight, Clock, Target, TrendingUp, TrendingDown,
  Activity, BarChart3, PieChart, Users, Zap, Bell
} from 'lucide-react';
import { Partner, DashboardStats, Workstream, Risk, Note, ActivityLogEntry } from '@/types';
import { format, differenceInDays, startOfMonth, endOfMonth, subDays, isAfter } from 'date-fns';

interface PartnerWithWorkstreams extends Partner {
  workstreams?: Workstream[];
  risks?: Risk[];
  notes?: Note[];
}

interface PortfolioMetrics {
  totalPartners: number;
  activePartners: number;
  launchingThisMonth: number;
  launchedThisMonth: number;
  atRiskCount: number;
  avgHealthScore: number;
  workstreamCompletionRate: number;
  openRisksCount: number;
  overdueCount: number;
  healthTrend: 'up' | 'down' | 'stable';
}

export default function DashboardPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const [partners, setPartners] = useState<PartnerWithWorkstreams[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel
      const [partnersRes, workstreamsRes, risksRes, notesRes, activityRes] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).eq('archived', false).order('updated_at', { ascending: false }),
        supabase.from('workstreams').select('*').eq('user_id', user.id),
        supabase.from('risks').select('*').eq('user_id', user.id),
        supabase.from('notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('activity_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);

      const partnersData = partnersRes.data || [];
      const workstreamsData = workstreamsRes.data || [];
      const risksData = risksRes.data || [];

      // Attach related data to partners
      const partnersWithData = partnersData.map(partner => ({
        ...partner,
        workstreams: workstreamsData.filter(w => w.partner_id === partner.id),
        risks: risksData.filter(r => r.partner_id === partner.id && r.status === 'open'),
      }));

      setPartners(partnersWithData);
      setRecentActivity(activityRes.data || []);

      // Calculate metrics
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const healthMax = settings?.health_scale_max || 5;
      const atRiskThreshold = healthMax * 0.4;

      const activePartners = partnersData.filter(p => !['churned', 'closed', 'complete'].includes(p.status));
      const launchingThisMonth = partnersData.filter(p => {
        if (!p.target_launch_date) return false;
        const launchDate = new Date(p.target_launch_date);
        return launchDate >= monthStart && launchDate <= monthEnd && !p.actual_launch_date;
      });
      const launchedThisMonth = partnersData.filter(p => {
        if (!p.actual_launch_date) return false;
        const launchDate = new Date(p.actual_launch_date);
        return launchDate >= monthStart && launchDate <= monthEnd;
      });

      const totalWorkstreams = workstreamsData.length;
      const completedWorkstreams = workstreamsData.filter(w => w.status === 'complete').length;
      const openRisks = risksData.filter(r => r.status === 'open');

      const avgHealth = activePartners.length > 0
        ? activePartners.reduce((sum, p) => sum + p.health_score, 0) / activePartners.length
        : 0;

      setMetrics({
        totalPartners: partnersData.length,
        activePartners: activePartners.length,
        launchingThisMonth: launchingThisMonth.length,
        launchedThisMonth: launchedThisMonth.length,
        atRiskCount: partnersData.filter(p => p.health_score <= atRiskThreshold).length,
        avgHealthScore: Math.round(avgHealth * 10) / 10,
        workstreamCompletionRate: totalWorkstreams > 0 ? Math.round((completedWorkstreams / totalWorkstreams) * 100) : 0,
        openRisksCount: openRisks.length,
        overdueCount: partnersData.filter(p => {
          if (!p.target_launch_date || p.actual_launch_date) return false;
          return new Date(p.target_launch_date) < now;
        }).length,
        healthTrend: 'stable', // TODO: Calculate from historical data
      });

      setLoading(false);
    };
    fetchData();
  }, [supabase, settings]);

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const partnerLabel = settings?.partner_label || 'Partner';
  const partnerLabelPlural = settings?.partner_label_plural || 'Partners';
  const healthMax = settings?.health_scale_max || 5;

  // Get partners needing attention
  const needsAttention = partners.filter(p => {
    const healthPercent = (p.health_score / healthMax) * 100;
    const daysUntilLaunch = p.target_launch_date
      ? differenceInDays(new Date(p.target_launch_date), new Date())
      : null;
    return healthPercent <= 40 || (daysUntilLaunch !== null && daysUntilLaunch <= 14 && daysUntilLaunch >= 0) || (p.risks?.length || 0) > 0;
  });

  // Status distribution for chart
  const statusDistribution = partners.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusConfig = (status: string) => {
    const customStatus = settings?.statuses?.find(s => s.value === status);
    if (customStatus) return customStatus;
    return { label: status, color: '#6B7280' };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Portfolio Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track health and progress across all your {partnerLabelPlural.toLowerCase()}.
          </p>
        </div>
        <Link
          href="/partners/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:scale-[1.02]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add {partnerLabel}
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          label={`Active ${partnerLabelPlural}`}
          value={metrics?.activePartners || 0}
          subValue={`of ${metrics?.totalPartners || 0} total`}
          color="var(--accent)"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Health Score"
          value={metrics?.avgHealthScore || 0}
          subValue={`of ${healthMax} max`}
          color={getHealthColor(metrics?.avgHealthScore || 0, healthMax)}
          trend={metrics?.healthTrend}
        />
        <MetricCard
          icon={<Calendar className="w-5 h-5" />}
          label="Launching This Month"
          value={metrics?.launchingThisMonth || 0}
          subValue={metrics?.launchedThisMonth ? `${metrics.launchedThisMonth} launched` : undefined}
          color="#3B82F6"
        />
        <MetricCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Needs Attention"
          value={(metrics?.atRiskCount || 0) + (metrics?.overdueCount || 0)}
          subValue={`${metrics?.openRisksCount || 0} open risks`}
          color={(metrics?.atRiskCount || 0) > 0 ? '#EF4444' : '#22C55E'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Status Distribution & Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Distribution */}
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Status Distribution
              </h3>
              <PieChart className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
            {Object.keys(statusDistribution).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(statusDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const config = getStatusConfig(status);
                    const percent = metrics?.totalPartners ? Math.round((count / metrics.totalPartners) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span style={{ color: 'var(--text-primary)' }}>{config.label}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{count} ({percent}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%`, background: config.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No {partnerLabelPlural.toLowerCase()} yet</p>
            )}
          </div>

          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Needs Attention
                </h3>
              </div>
              <div className="space-y-3">
                {needsAttention.slice(0, 5).map(partner => {
                  const statusConfig = getStatusConfig(partner.status);
                  const daysUntilLaunch = partner.target_launch_date
                    ? differenceInDays(new Date(partner.target_launch_date), new Date())
                    : null;

                  const reasons: string[] = [];
                  if ((partner.health_score / healthMax) * 100 <= 40) reasons.push('Low health');
                  if (daysUntilLaunch !== null && daysUntilLaunch <= 14 && daysUntilLaunch >= 0) reasons.push(`${daysUntilLaunch}d to launch`);
                  if (daysUntilLaunch !== null && daysUntilLaunch < 0) reasons.push('Overdue');
                  if (partner.risks?.length) reasons.push(`${partner.risks.length} risk${partner.risks.length > 1 ? 's' : ''}`);

                  return (
                    <Link
                      key={partner.id}
                      href={`/partners/${partner.id}`}
                      className="flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.01] group"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: getHealthColor(partner.health_score, healthMax) }}
                        >
                          {partner.health_score}
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            {partner.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {reasons.map((reason, i) => (
                              <span key={i} className={i > 0 ? 'before:content-["•"] before:mr-2' : ''}>
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                    </Link>
                  );
                })}
              </div>
              {needsAttention.length > 5 && (
                <Link
                  href="/partners?filter=attention"
                  className="mt-4 text-sm font-medium flex items-center gap-1"
                  style={{ color: 'var(--accent)' }}
                >
                  View all {needsAttention.length} needing attention
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}

          {/* Recent Partners */}
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent {partnerLabelPlural}
              </h3>
              <Link
                href="/partners"
                className="text-sm font-medium flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {partners.length > 0 ? (
              <div className="space-y-3">
                {partners.slice(0, 5).map(partner => {
                  const statusConfig = getStatusConfig(partner.status);
                  const totalWs = partner.workstreams?.length || 0;
                  const completedWs = partner.workstreams?.filter(w => w.status === 'complete').length || 0;
                  const progressPercent = totalWs > 0 ? Math.round((completedWs / totalWs) * 100) : 0;

                  return (
                    <Link
                      key={partner.id}
                      href={`/partners/${partner.id}`}
                      className="flex items-center justify-between p-3 rounded-lg transition-all hover:scale-[1.01] group"
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: getHealthColor(partner.health_score, healthMax) }}
                        >
                          {partner.health_score}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {partner.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                            >
                              {statusConfig.label}
                            </span>
                            {totalWs > 0 && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {progressPercent}% complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Rocket className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  No {partnerLabelPlural.toLowerCase()} yet
                </p>
                <Link
                  href="/partners/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Plus className="w-4 h-4" />
                  Add your first {partnerLabel.toLowerCase()}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/partners/new"
                className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Add new {partnerLabel.toLowerCase()}
                </span>
              </Link>
              <Link
                href="/partners"
                className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#3B82F620', color: '#3B82F6' }}>
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  View all {partnerLabelPlural.toLowerCase()}
                </span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Configure settings
                </span>
              </Link>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Performance
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-muted)' }}>Workstream Completion</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{metrics?.workstreamCompletionRate || 0}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${metrics?.workstreamCompletionRate || 0}%`,
                      background: (metrics?.workstreamCompletionRate || 0) >= 70 ? '#22C55E' : (metrics?.workstreamCompletionRate || 0) >= 40 ? '#F59E0B' : '#EF4444',
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {metrics?.launchedThisMonth || 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Launched this month</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {metrics?.openRisksCount || 0}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Open risks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent Activity
              </h3>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, i) => (
                  <div key={activity.id || i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {formatActivityMessage(activity)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {trend && trend !== 'stable' && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend === 'up' ? 'Up' : 'Down'}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      {subValue && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

function formatActivityMessage(activity: ActivityLogEntry): string {
  const { action, entity_type, entity_name, details } = activity;
  const entityLabel = entity_name || entity_type;

  switch (action) {
    case 'created':
      return `Created ${entityLabel}`;
    case 'updated':
      return `Updated ${entityLabel}`;
    case 'status_changed':
      return `Changed status of ${entityLabel}`;
    case 'health_changed':
      return `Updated health for ${entityLabel}`;
    case 'workstream_completed':
      return `Completed workstream in ${entityLabel}`;
    case 'note_added':
      return `Added note to ${entityLabel}`;
    case 'risk_added':
      return `Added risk to ${entityLabel}`;
    default:
      return `Activity on ${entityLabel}`;
  }
}
