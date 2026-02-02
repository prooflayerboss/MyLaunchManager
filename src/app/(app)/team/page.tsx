'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import {
  Users, UserPlus, Crown, Shield, Eye, MoreHorizontal,
  Mail, Clock, Check, X, Copy, Trash2, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

export default function TeamPage() {
  const {
    team,
    members,
    invitations,
    loading,
    isOwner,
    isAdmin,
    createTeam,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvitation,
  } = useTeam();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ id: user.id, email: user.email || '' });
      }
    };
    fetchUser();
  }, [supabase]);

  // Fetch member emails
  useEffect(() => {
    const fetchMemberEmails = async () => {
      if (members.length === 0) return;

      const { data } = await supabase
        .from('auth.users')
        .select('id, email')
        .in('id', members.map(m => m.user_id));

      if (data) {
        const emailMap: Record<string, string> = {};
        data.forEach((u: any) => {
          emailMap[u.id] = u.email;
        });
        setMemberEmails(emailMap);
      }
    };
    // Note: This won't work directly as auth.users isn't accessible via the client
    // You'd need a server function or store emails elsewhere
  }, [members, supabase]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    setError('');

    const result = await createTeam(teamName.trim());
    if (result.error) {
      setError(result.error);
    } else {
      setShowCreateTeam(false);
      setTeamName('');
    }
    setCreating(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');

    const result = await inviteMember(inviteEmail.trim(), inviteRole);
    if (result.error) {
      setError(result.error);
    } else {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    }
    setInviting(false);
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Member';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  // No team yet
  if (!team) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Create Your Team
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Collaborate with your colleagues by creating a team workspace.
          </p>
        </div>

        {showCreateTeam ? (
          <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Team Name
            </h3>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Acme Inc"
              className="w-full px-4 py-3 rounded-lg text-sm mb-4"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateTeam(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={creating || !teamName.trim()}
                className="flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateTeam(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <UserPlus className="w-5 h-5" />
            Create a Team
          </button>
        )}

        <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          <h4 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Team benefits:</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Invite team members to collaborate
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Assign owners to partners and tasks
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Control permissions with roles
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Share templates and settings
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {team.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage your team members and permissions
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all hover:scale-[1.02]"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {members.filter(m => m.status === 'active').length}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Active Members</div>
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {invitations.length}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending Invites</div>
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
            {team.plan}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Plan</div>
        </div>
      </div>

      {/* Members List */}
      <div className="p-6 rounded-xl mb-6" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Team Members
        </h3>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ background: 'var(--accent)' }}
                >
                  {memberEmails[member.user_id]?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {memberEmails[member.user_id] || `User ${member.user_id.slice(0, 8)}`}
                    {member.user_id === currentUser?.id && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {getRoleIcon(member.role)}
                    <span>{getRoleLabel(member.role)}</span>
                    {member.joined_at && (
                      <>
                        <span>•</span>
                        <span>Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {isOwner && member.role !== 'owner' && member.user_id !== currentUser?.id && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this member?')) {
                        removeMember(member.id);
                      }
                    }}
                    className="p-2 rounded-lg transition-colors hover:bg-red-100"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="p-6 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Pending Invitations
          </h3>
          <div className="space-y-3">
            {invitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {invite.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {getRoleIcon(invite.role)}
                      <span>{getRoleLabel(invite.role)}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>Expires {format(new Date(invite.expires_at), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyInviteLink(invite.token)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                  >
                    {copied === invite.token ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => cancelInvitation(invite.id)}
                      className="p-2 rounded-lg transition-colors hover:bg-red-100"
                      title="Cancel invitation"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: 'var(--bg-primary)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Invite Team Member
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="member">Member - Can view and edit</option>
                  <option value="admin">Admin - Can manage team</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setError('');
                  setInviteEmail('');
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
