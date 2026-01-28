'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in');
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
    } else if (data) {
      router.push(`/projects/${data.id}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors hover:opacity-70"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to projects
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
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            New Project
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Set up your launch or program
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-xl p-6 space-y-6"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Project name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Q1 Product Launch"
            required
            className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this project..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 resize-none"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/projects"
            className="flex-1 py-3 rounded-xl font-medium text-center transition-all hover:scale-[1.02]"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Creating...' : 'Create Project'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
