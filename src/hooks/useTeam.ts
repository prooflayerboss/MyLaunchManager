'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Team, TeamMember, TeamInvitation } from '@/types';

export function useTeam() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchTeam = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is part of a team
      const { data: membership } = await supabase
        .from('team_members')
        .select('*, team:teams(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (membership?.team) {
        setTeam(membership.team as Team);
        setIsOwner(membership.role === 'owner');
        setIsAdmin(membership.role === 'owner' || membership.role === 'admin');

        // Fetch all members
        const { data: membersData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', membership.team.id)
          .order('joined_at');

        if (membersData) {
          setMembers(membersData);
        }

        // Fetch pending invitations
        const { data: invitesData } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_id', membership.team.id)
          .gt('expires_at', new Date().toISOString());

        if (invitesData) {
          setInvitations(invitesData);
        }
      }

      setLoading(false);
    };

    fetchTeam();
  }, [supabase]);

  const createTeam = useCallback(async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({
        name,
        slug: `${slug}-${Date.now().toString(36)}`,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    // Add owner as team member
    await supabase
      .from('team_members')
      .insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    setTeam(newTeam);
    setIsOwner(true);
    setIsAdmin(true);

    return { data: newTeam };
  }, [supabase]);

  const inviteMember = useCallback(async (email: string, role: 'admin' | 'member' | 'viewer' = 'member') => {
    if (!team) return { error: 'No team' };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: team.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: 'This email has already been invited' };
      }
      return { error: error.message };
    }

    setInvitations([...invitations, data]);
    return { data };
  }, [team, supabase, invitations]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!team || !isAdmin) return { error: 'Not authorized' };

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', team.id);

    if (error) return { error: error.message };

    setMembers(members.filter(m => m.id !== memberId));
    return { success: true };
  }, [team, isAdmin, supabase, members]);

  const updateMemberRole = useCallback(async (memberId: string, role: 'admin' | 'member' | 'viewer') => {
    if (!team || !isOwner) return { error: 'Not authorized' };

    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId)
      .eq('team_id', team.id);

    if (error) return { error: error.message };

    setMembers(members.map(m => m.id === memberId ? { ...m, role } : m));
    return { success: true };
  }, [team, isOwner, supabase, members]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    if (!team || !isAdmin) return { error: 'Not authorized' };

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('team_id', team.id);

    if (error) return { error: error.message };

    setInvitations(invitations.filter(i => i.id !== invitationId));
    return { success: true };
  }, [team, isAdmin, supabase, invitations]);

  return {
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
  };
}
