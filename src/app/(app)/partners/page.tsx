'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSettings, getHealthColor } from '@/hooks/useSettings';
import {
  Plus, Search, Filter, Calendar, ArrowUpDown,
  MoreHorizontal, Archive, Trash2
} from 'lucide-react';
import { Partner } from '@/types';
import { format, differenceInDays } from 'date-fns';

export default function PartnersPage() {
  const { settings, loading: settingsLoading } = useSettings();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'health' | 'launch_date' | 'updated'>('updated');
  const supabase = createClient();

  useEffect(() => {
    const fetchPartners = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (data) {
        setPartners(data);
      }
      setLoading(false);
    };
    fetchPartners();
  }, [supabase]);

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

  const getStatusConfig = (status: string) => {
    return settings?.statuses?.find(s => s.value === status) || { label: status, color: '#6B7280' };
  };

  // Filter and sort
  let filteredPartners = partners
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => statusFilter === 'all' || p.status === statusFilter);

  // Sort
  filteredPartners = [...filteredPartners].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'health':
        return a.health_score - b.health_score;
      case 'launch_date':
        if (!a.target_launch_date) return 1;
        if (!b.target_launch_date) return -1;
        return new Date(a.target_launch_date).getTime() - new Date(b.target_launch_date).getTime();
      case 'updated':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {partnerLabelPlural}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {partners.length} {partners.length === 1 ? partnerLabel.toLowerCase() : partnerLabelPlural.toLowerCase()}
          </p>
        </div>
        <Link
          href="/partners/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add {partnerLabel}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={`Search ${partnerLabelPlural.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="all">All statuses</option>
          {settings?.statuses?.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name</option>
          <option value="health">Health score</option>
          <option value="launch_date">Launch date</option>
        </select>
      </div>

      {/* Partners Table */}
      {filteredPartners.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          {search || statusFilter !== 'all' ? (
            <>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                No {partnerLabelPlural.toLowerCase()} found
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Try adjusting your search or filters.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                No {partnerLabelPlural.toLowerCase()} yet
              </h3>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                Add your first {partnerLabel.toLowerCase()} to get started.
              </p>
              <Link
                href="/partners/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Plus className="w-5 h-5" />
                Add {partnerLabel}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Name
                </th>
                <th className="text-left px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Status
                </th>
                <th className="text-left px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Health
                </th>
                <th className="text-left px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Launch Date
                </th>
                <th className="text-left px-5 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Contact
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner, index) => {
                const statusConfig = getStatusConfig(partner.status);
                const daysUntilLaunch = partner.target_launch_date
                  ? differenceInDays(new Date(partner.target_launch_date), new Date())
                  : null;

                return (
                  <tr
                    key={partner.id}
                    className="group transition-colors hover:bg-gray-50"
                    style={{ borderBottom: index < filteredPartners.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/partners/${partner.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {partner.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
                          style={{ background: getHealthColor(partner.health_score, healthMax) }}
                        >
                          {partner.health_score}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          / {healthMax}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {partner.target_launch_date ? (
                        <div>
                          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {format(new Date(partner.target_launch_date), 'MMM d, yyyy')}
                          </div>
                          {daysUntilLaunch !== null && (
                            <div className="text-xs" style={{ color: daysUntilLaunch < 0 ? '#EF4444' : 'var(--text-muted)' }}>
                              {daysUntilLaunch === 0 ? 'Today' :
                                daysUntilLaunch < 0 ? `${Math.abs(daysUntilLaunch)} days ago` :
                                  `In ${daysUntilLaunch} days`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {partner.primary_contact_name ? (
                        <div>
                          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {partner.primary_contact_name}
                          </div>
                          {partner.primary_contact_email && (
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {partner.primary_contact_email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/partners/${partner.id}`}
                        className="p-2 rounded-lg transition-colors hover:bg-gray-100 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
