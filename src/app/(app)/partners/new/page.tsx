'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { ArrowLeft, ArrowRight, Rocket, Calendar, User, Mail, Link as LinkIcon } from 'lucide-react';

export default function NewPartnerPage() {
  const router = useRouter();
  const supabase = createClient();
  const { settings } = useSettings();

  const [name, setName] = useState('');
  const [status, setStatus] = useState('discovery');
  const [targetLaunchDate, setTargetLaunchDate] = useState('');
  const [healthScore, setHealthScore] = useState(3);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [externalChannel, setExternalChannel] = useState('');
  const [createWorkstreams, setCreateWorkstreams] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const partnerLabel = settings?.partner_label || 'Partner';
  const healthMax = settings?.health_scale_max || 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in');
      setLoading(false);
      return;
    }

    // Create partner
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        user_id: user.id,
        name,
        status,
        target_launch_date: targetLaunchDate || null,
        health_score: healthScore,
        primary_contact_name: contactName || null,
        primary_contact_email: contactEmail || null,
        external_channel: externalChannel || null,
      })
      .select()
      .single();

    if (partnerError) {
      setError(partnerError.message);
      setLoading(false);
      return;
    }

    // Create default workstreams if enabled
    if (createWorkstreams && settings?.default_workstreams && partner) {
      const workstreamsToCreate = settings.default_workstreams.map(ws => ({
        user_id: user.id,
        partner_id: partner.id,
        name: ws.name,
        sort_order: ws.sort_order,
        status: 'not_started',
      }));

      await supabase.from('workstreams').insert(workstreamsToCreate);
    }

    router.push(`/partners/${partner.id}`);
  };

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/partners"
        className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-70"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {settings?.partner_label_plural?.toLowerCase() || 'partners'}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Rocket className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            New {partnerLabel}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Add a new {partnerLabel.toLowerCase()} to track
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div
          className="p-6 rounded-xl space-y-5"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Basic Information</h2>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {partnerLabel} Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${partnerLabel.toLowerCase()} name`}
              required
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {settings?.statuses?.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Health Score
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max={healthMax}
                  value={healthScore}
                  onChange={(e) => setHealthScore(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white"
                  style={{ background: healthScore <= 2 ? '#EF4444' : healthScore <= 3 ? '#F59E0B' : '#22C55E' }}
                >
                  {healthScore}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              <Calendar className="w-4 h-4 inline mr-1" />
              Target Launch Date
            </label>
            <input
              type="date"
              value={targetLaunchDate}
              onChange={(e) => setTargetLaunchDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Contact Info */}
        <div
          className="p-6 rounded-xl space-y-5"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Contact Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <User className="w-4 h-4 inline mr-1" />
                Primary Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Mail className="w-4 h-4 inline mr-1" />
                Primary Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="john@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              <LinkIcon className="w-4 h-4 inline mr-1" />
              External Channel (Slack, Teams, etc.)
            </label>
            <input
              type="text"
              value={externalChannel}
              onChange={(e) => setExternalChannel(e.target.value)}
              placeholder="https://company.slack.com/channels/partner-name"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Workstreams */}
        <div
          className="p-6 rounded-xl"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createWorkstreams}
              onChange={(e) => setCreateWorkstreams(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Create default {settings?.workstream_label_plural?.toLowerCase() || 'workstreams'}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Auto-create {settings?.default_workstreams?.length || 0} {settings?.workstream_label_plural?.toLowerCase() || 'workstreams'} from your template
              </div>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/partners"
            className="flex-1 py-3 rounded-xl font-medium text-center transition-all hover:scale-[1.01]"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-3 rounded-xl font-semibold transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Creating...' : `Create ${partnerLabel}`}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
