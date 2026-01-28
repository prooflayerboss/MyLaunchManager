'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Rocket, ArrowRight, ArrowLeft, Plus, X, GripVertical, Check } from 'lucide-react';
import { StatusConfig, DefaultWorkstream } from '@/types';

const SUGGESTED_LABELS = [
  { singular: 'Partner', plural: 'Partners' },
  { singular: 'Client', plural: 'Clients' },
  { singular: 'Customer', plural: 'Customers' },
  { singular: 'Account', plural: 'Accounts' },
  { singular: 'Project', plural: 'Projects' },
];

const DEFAULT_STATUSES: StatusConfig[] = [
  { value: 'discovery', label: 'Discovery', color: '#8B5CF6' },
  { value: 'kickoff', label: 'Kickoff', color: '#3B82F6' },
  { value: 'build', label: 'Build', color: '#F59E0B' },
  { value: 'pilot', label: 'Pilot', color: '#10B981' },
  { value: 'live', label: 'Live', color: '#22C55E' },
  { value: 'paused', label: 'Paused', color: '#6B7280' },
  { value: 'churned', label: 'Churned', color: '#EF4444' },
];

const DEFAULT_WORKSTREAMS: DefaultWorkstream[] = [
  { name: 'Kickoff', sort_order: 0 },
  { name: 'Discovery & Requirements', sort_order: 1 },
  { name: 'Configuration', sort_order: 2 },
  { name: 'Integration', sort_order: 3 },
  { name: 'Training', sort_order: 4 },
  { name: 'UAT / Pilot', sort_order: 5 },
  { name: 'Go-Live', sort_order: 6 },
];

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#6B7280',
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Step 1: Labels
  const [partnerLabel, setPartnerLabel] = useState('Partner');
  const [partnerLabelPlural, setPartnerLabelPlural] = useState('Partners');

  // Step 2: Workstreams
  const [workstreams, setWorkstreams] = useState<DefaultWorkstream[]>(DEFAULT_WORKSTREAMS);
  const [newWorkstream, setNewWorkstream] = useState('');

  // Step 3: Statuses
  const [statuses, setStatuses] = useState<StatusConfig[]>(DEFAULT_STATUSES);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const checkSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSettingsId(data.id);
        if (data.onboarding_completed) {
          router.push('/dashboard');
        }
      } else {
        // Create settings
        const { data: newSettings } = await supabase
          .from('organization_settings')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (newSettings) {
          setSettingsId(newSettings.id);
        }
      }
    };
    checkSettings();
  }, [router, supabase]);

  const handleLabelSelect = (label: { singular: string; plural: string }) => {
    setPartnerLabel(label.singular);
    setPartnerLabelPlural(label.plural);
  };

  const handleAddWorkstream = () => {
    if (!newWorkstream.trim()) return;
    setWorkstreams([
      ...workstreams,
      { name: newWorkstream.trim(), sort_order: workstreams.length }
    ]);
    setNewWorkstream('');
  };

  const handleRemoveWorkstream = (index: number) => {
    setWorkstreams(workstreams.filter((_, i) => i !== index));
  };

  const handleAddStatus = () => {
    if (!newStatus.trim()) return;
    const value = newStatus.toLowerCase().replace(/\s+/g, '_');
    const unusedColor = COLORS.find(c => !statuses.some(s => s.color === c)) || COLORS[0];
    setStatuses([
      ...statuses,
      { value, label: newStatus.trim(), color: unusedColor }
    ]);
    setNewStatus('');
  };

  const handleRemoveStatus = (index: number) => {
    setStatuses(statuses.filter((_, i) => i !== index));
  };

  const handleStatusColorChange = (index: number, color: string) => {
    const updated = [...statuses];
    updated[index].color = color;
    setStatuses(updated);
  };

  const handleComplete = async () => {
    setLoading(true);

    // Get current user to ensure we update the right record
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found');
      setLoading(false);
      return;
    }

    const settingsData = {
      partner_label: partnerLabel,
      partner_label_plural: partnerLabelPlural,
      default_workstreams: workstreams,
      statuses: statuses,
      onboarding_completed: true,
    };

    // First try to update existing settings
    const { data: updateData, error: updateError } = await supabase
      .from('organization_settings')
      .update(settingsData)
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error('Update failed:', updateError);
      alert('Failed to save settings: ' + updateError.message);
      setLoading(false);
      return;
    }

    // If no rows were updated, insert new settings
    if (!updateData || updateData.length === 0) {
      const { error: insertError } = await supabase
        .from('organization_settings')
        .insert({ user_id: user.id, ...settingsData });

      if (insertError) {
        console.error('Insert failed:', insertError);
        alert('Failed to save settings: ' + insertError.message);
        setLoading(false);
        return;
      }
    }

    // Use full page reload to ensure fresh settings are fetched
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left side - Steps indicator */}
      <div className="hidden lg:flex w-80 flex-col p-8" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            LaunchPad
          </span>
        </div>

        <div className="space-y-4">
          {[
            { num: 1, title: 'Terminology', desc: 'What do you call your accounts?' },
            { num: 2, title: 'Workstreams', desc: 'Define your launch phases' },
            { num: 3, title: 'Statuses', desc: 'Track progress your way' },
            { num: 4, title: 'Ready!', desc: 'Start managing launches' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'text-white' : ''}`}
                style={{
                  background: step > s.num ? '#22C55E' : step === s.num ? 'var(--accent)' : 'var(--border)',
                  color: step >= s.num ? 'white' : 'var(--text-muted)'
                }}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl">
          {/* Step 1: Terminology */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                What do you call the companies you're launching?
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                We'll use this terminology throughout the app.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {SUGGESTED_LABELS.map((label) => (
                  <button
                    key={label.singular}
                    onClick={() => handleLabelSelect(label)}
                    className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${partnerLabel === label.singular ? 'ring-2 ring-[#E54D2E]' : ''}`}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{label.plural}</div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>"{label.singular}"</div>
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Or enter custom:</div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={partnerLabel}
                    onChange={(e) => setPartnerLabel(e.target.value)}
                    placeholder="Singular"
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    value={partnerLabelPlural}
                    onChange={(e) => setPartnerLabelPlural(e.target.value)}
                    placeholder="Plural"
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Workstreams */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                What phases are in your launches?
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                These will be the default workstreams for each new {partnerLabel.toLowerCase()}.
              </p>

              <div className="space-y-2 mb-4">
                {workstreams.map((ws, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg group"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <GripVertical className="w-4 h-4 cursor-grab" style={{ color: 'var(--text-muted)' }} />
                    <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{ws.name}</span>
                    <button
                      onClick={() => handleRemoveWorkstream(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWorkstream}
                  onChange={(e) => setNewWorkstream(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWorkstream()}
                  placeholder="Add a workstream..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleAddWorkstream}
                  className="px-4 py-3 rounded-xl"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Statuses */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                What statuses do you track?
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Define the stages a {partnerLabel.toLowerCase()} goes through.
              </p>

              <div className="space-y-2 mb-4">
                {statuses.map((status, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg group"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="relative">
                      <div
                        className="w-6 h-6 rounded-full cursor-pointer"
                        style={{ background: status.color }}
                      />
                      <input
                        type="color"
                        value={status.color}
                        onChange={(e) => handleStatusColorChange(index, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{status.label}</span>
                    <button
                      onClick={() => handleRemoveStatus(index)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                  placeholder="Add a status..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleAddStatus}
                  className="px-4 py-3 rounded-xl"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="animate-fade-up text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Check className="w-10 h-10" />
              </div>
              <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                You're all set!
              </h1>
              <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Your LaunchPad is configured. Ready to start tracking your first {partnerLabel.toLowerCase()}?
              </p>

              <div className="p-6 rounded-xl text-left mb-8" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-muted)' }}>Your configuration:</div>
                <div className="space-y-2 text-sm">
                  <div><span style={{ color: 'var(--text-muted)' }}>Terminology:</span> <span style={{ color: 'var(--text-primary)' }}>{partnerLabelPlural}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Workstreams:</span> <span style={{ color: 'var(--text-primary)' }}>{workstreams.length} phases</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Statuses:</span> <span style={{ color: 'var(--text-primary)' }}>{statuses.length} stages</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {loading ? 'Saving...' : 'Go to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
