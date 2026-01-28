'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Folder, Calendar, ArrowRight, Rocket } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setProjects(data);
      }
      setLoading(false);
    };
    fetchProjects();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading projects...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Your Projects
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Rocket className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No projects yet
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create your first project to start tracking your launch.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus className="w-5 h-5" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* New project card */}
          <Link
            href="/projects/new"
            className="rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] group min-h-[180px]"
            style={{ background: 'var(--bg-primary)', border: '2px dashed var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:scale-110"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              New Project
            </span>
          </Link>

          {/* Project cards */}
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-xl p-6 transition-all hover:scale-[1.02] group"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <ArrowRight
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Calendar className="w-3 h-3" />
                Updated {format(new Date(project.updated_at), 'MMM d, yyyy')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
