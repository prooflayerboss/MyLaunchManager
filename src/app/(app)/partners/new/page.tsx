'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { ArrowLeft, ArrowRight, Rocket, Calendar, User, Mail, Users, FileText, Upload, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';

// Status options with default health scores
const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: '#6B7280', healthScore: 3 },
  { value: 'initiation', label: 'Initiation', color: '#8B5CF6', healthScore: 3 },
  { value: 'discovery', label: 'Discovery', color: '#22C55E', healthScore: 4 },
  { value: 'configuration', label: 'Configuration', color: '#F59E0B', healthScore: 4 },
  { value: 'internal_testing', label: 'Internal Testing', color: '#22C55E', healthScore: 4 },
  { value: 'uat', label: 'UAT', color: '#EAB308', healthScore: 4 },
  { value: 'go_no_go', label: 'Go No Go', color: '#EAB308', healthScore: 4 },
  { value: 'soft_launch', label: 'Soft Launch', color: '#F59E0B', healthScore: 4 },
  { value: 'live', label: 'LIVE', color: '#22C55E', healthScore: 5 },
  { value: 'optimisation', label: 'Optimisation', color: '#F97316', healthScore: 4 },
  { value: 'on_hold', label: 'On Hold', color: '#EAB308', healthScore: 2 },
  { value: 'blocked', label: 'Blocked', color: '#EF4444', healthScore: 1 },
  { value: 'closed', label: 'Closed', color: '#6B7280', healthScore: 3 },
];

// Role options for stakeholders
const ROLE_OPTIONS = [
  { value: 'pm', label: 'Project Manager (PM)' },
  { value: 'aide', label: 'AIDE' },
  { value: 'csm', label: 'Customer Success Manager (CSM)' },
  { value: 'kms', label: 'KMS' },
  { value: 'ai_trainer', label: 'AI Trainer' },
  { value: 'account_executive', label: 'Account Executive' },
  { value: 'solutions_architect', label: 'Solutions Architect' },
  { value: 'technical_lead', label: 'Technical Lead' },
  { value: 'implementation_specialist', label: 'Implementation Specialist' },
  { value: 'other', label: 'Other' },
];

interface Stakeholder {
  id: string;
  name: string;
  role: string;
}

export default function NewPartnerPage() {
  const router = useRouter();
  const supabase = createClient();
  const { settings } = useSettings();

  // Basic info
  const [name, setName] = useState('');
  const [status, setStatus] = useState('not_started');
  const [healthScore, setHealthScore] = useState(3);
  const [targetLaunchDate, setTargetLaunchDate] = useState('');
  const [assignedDate, setAssignedDate] = useState('');

  // Discovery call
  const [discoveryScheduled, setDiscoveryScheduled] = useState<boolean | null>(null);
  const [discoveryDate, setDiscoveryDate] = useState('');

  // Contact info
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Internal stakeholders - dynamic list
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([
    { id: crypto.randomUUID(), name: '', role: 'pm' }
  ]);

  // Documents
  const [sddrFile, setSddrFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  const [createWorkstreams, setCreateWorkstreams] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const partnerLabel = settings?.partner_label || 'Partner';
  const healthMax = settings?.health_scale_max || 5;

  // Auto-update health score when status changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const statusOption = STATUS_OPTIONS.find(s => s.value === newStatus);
    if (statusOption) {
      setHealthScore(statusOption.healthScore);
    }
  };

  // Stakeholder management
  const addStakeholder = () => {
    setStakeholders(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', role: 'pm' }
    ]);
  };

  const removeStakeholder = (id: string) => {
    setStakeholders(prev => prev.filter(s => s.id !== id));
  };

  const updateStakeholder = (id: string, field: 'name' | 'role', value: string) => {
    setStakeholders(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleFileUpload = async (file: File, type: 'sddr' | 'contract') => {
    if (type === 'sddr') {
      setSddrFile(file);
    } else {
      setContractFile(file);
    }
  };

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

    // Upload documents if provided
    let sddrUrl = null;
    let contractUrl = null;

    if (sddrFile) {
      const { data: sddrData, error: sddrError } = await supabase.storage
        .from('documents')
        .upload(`${user.id}/${Date.now()}_sddr_${sddrFile.name}`, sddrFile);

      if (!sddrError && sddrData) {
        sddrUrl = sddrData.path;
      }
    }

    if (contractFile) {
      const { data: contractData, error: contractError } = await supabase.storage
        .from('documents')
        .upload(`${user.id}/${Date.now()}_contract_${contractFile.name}`, contractFile);

      if (!contractError && contractData) {
        contractUrl = contractData.path;
      }
    }

    // Filter out empty stakeholders and format for storage
    const validStakeholders = stakeholders
      .filter(s => s.name.trim())
      .map(s => ({ name: s.name, role: s.role }));

    // Create partner with custom fields for new data
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
        custom_fields: {
          assigned_date: assignedDate || null,
          discovery_scheduled: discoveryScheduled,
          discovery_date: discoveryScheduled ? discoveryDate : null,
          stakeholders: validStakeholders,
          documents: {
            sddr: sddrUrl ? { path: sddrUrl, name: sddrFile?.name, uploaded_at: new Date().toISOString() } : null,
            contract: contractUrl ? { path: contractUrl, name: contractFile?.name, uploaded_at: new Date().toISOString() } : null,
          },
        },
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

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div className="max-w-3xl">
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
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {currentStatusOption && (
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: currentStatusOption.color }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Auto health: {currentStatusOption.healthScore}/{healthMax}
                  </span>
                </div>
              )}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Assigned Date
              </label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
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
        </div>

        {/* Discovery Call */}
        <div
          className="p-6 rounded-xl space-y-5"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Discovery Call</h2>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Discovery call scheduled?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDiscoveryScheduled(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  discoveryScheduled === true ? 'ring-2 ring-[#22C55E]' : ''
                }`}
                style={{
                  background: discoveryScheduled === true ? '#DCFCE7' : 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: discoveryScheduled === true ? '#16A34A' : 'var(--text-primary)',
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscoveryScheduled(false);
                  setDiscoveryDate('');
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  discoveryScheduled === false ? 'ring-2 ring-[#EF4444]' : ''
                }`}
                style={{
                  background: discoveryScheduled === false ? '#FEE2E2' : 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: discoveryScheduled === false ? '#DC2626' : 'var(--text-primary)',
                }}
              >
                <XCircle className="w-4 h-4" />
                No
              </button>
            </div>
          </div>

          {discoveryScheduled && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Discovery Call Date
              </label>
              <input
                type="date"
                value={discoveryDate}
                onChange={(e) => setDiscoveryDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div
          className="p-6 rounded-xl space-y-5"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Primary Contact</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <User className="w-4 h-4 inline mr-1" />
                Contact Name
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
                Contact Email
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
        </div>

        {/* Internal Stakeholders */}
        <div
          className="p-6 rounded-xl space-y-5"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Internal Stakeholders</h2>
            </div>
            <button
              type="button"
              onClick={addStakeholder}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {stakeholders.map((stakeholder, index) => (
              <div key={stakeholder.id} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={stakeholder.name}
                    onChange={(e) => updateStakeholder(stakeholder.id, 'name', e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="w-56">
                  <select
                    value={stakeholder.role}
                    onChange={(e) => updateStakeholder(stakeholder.id, 'role', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                {stakeholders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStakeholder(stakeholder.id)}
                    className="p-3 rounded-xl transition-all hover:scale-[1.05]"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {stakeholders.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No stakeholders added. Click "Add" to add team members.
            </p>
          )}
        </div>

        {/* Documents */}
        <div
          className="p-6 rounded-xl space-y-5"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Documents</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                SDDR
              </label>
              <label
                className="flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}
              >
                {sddrFile ? (
                  <>
                    <CheckCircle className="w-8 h-8 mb-2" style={{ color: '#22C55E' }} />
                    <span className="text-sm font-medium text-center" style={{ color: 'var(--text-primary)' }}>
                      {sddrFile.name}
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Click to replace
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Upload SDDR
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      PDF, DOC, DOCX
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'sddr')}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Contract
              </label>
              <label
                className="flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}
              >
                {contractFile ? (
                  <>
                    <CheckCircle className="w-8 h-8 mb-2" style={{ color: '#22C55E' }} />
                    <span className="text-sm font-medium text-center" style={{ color: 'var(--text-primary)' }}>
                      {contractFile.name}
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Click to replace
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Upload Contract
                    </span>
                    <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      PDF, DOC, DOCX
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'contract')}
                />
              </label>
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong>Coming soon:</strong> Smart document analysis will automatically extract key dates,
              deliverables, and terms from your SDDR and Contract to help track milestones.
            </p>
          </div>
        </div>

        {/* Workstreams */}
        <div
          className="p-6 rounded-xl space-y-4"
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
                Auto-create standard phases for this {partnerLabel.toLowerCase()}
              </div>
            </div>
          </label>

          {createWorkstreams && (
            <div className="ml-8 flex flex-wrap gap-2">
              {(settings?.default_workstreams?.length ? settings.default_workstreams : [
                { name: 'Kickoff', sort_order: 0 },
                { name: 'Discovery & Requirements', sort_order: 1 },
                { name: 'Configuration', sort_order: 2 },
                { name: 'Integration', sort_order: 3 },
                { name: 'Training', sort_order: 4 },
                { name: 'UAT / Pilot', sort_order: 5 },
                { name: 'Go-Live', sort_order: 6 },
              ]).map((ws, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  {ws.name}
                </span>
              ))}
            </div>
          )}
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
