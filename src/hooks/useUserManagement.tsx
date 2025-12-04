import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: 'pending' | 'approved' | 'blocked';
  created_at: string | null;
  isAdmin?: boolean;
}

export interface UserStats {
  total: number;
  pending: number;
  approved: number;
  blocked: number;
  admins: number;
}

export interface AdminAction {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  action_type: string;
  details: string | null;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
  target_name?: string;
  target_email?: string;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats>({ total: 0, pending: 0, approved: 0, blocked: 0, admins: 0 });
  const [actionHistory, setActionHistory] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch admin roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      const adminUserIds = new Set((rolesData || []).map(r => r.user_id));

      const typedUsers = (data || []).map(user => ({
        ...user,
        status: (user.status as 'pending' | 'approved' | 'blocked') || 'pending',
        isAdmin: adminUserIds.has(user.id)
      }));

      setUsers(typedUsers);
      
      // Calculate stats
      const newStats: UserStats = {
        total: typedUsers.length,
        pending: typedUsers.filter(u => u.status === 'pending').length,
        approved: typedUsers.filter(u => u.status === 'approved').length,
        blocked: typedUsers.filter(u => u.status === 'blocked').length,
        admins: adminUserIds.size,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchActionHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('admin_action_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user profiles for admin and target names
      const userIds = new Set<string>();
      (data || []).forEach(action => {
        userIds.add(action.admin_user_id);
        userIds.add(action.target_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map(p => [p.id, { name: p.full_name, email: p.email }])
      );

      const enrichedActions = (data || []).map(action => ({
        ...action,
        admin_name: profileMap.get(action.admin_user_id)?.name || null,
        admin_email: profileMap.get(action.admin_user_id)?.email || null,
        target_name: profileMap.get(action.target_user_id)?.name || null,
        target_email: profileMap.get(action.target_user_id)?.email || null,
      }));

      setActionHistory(enrichedActions);
    } catch (error) {
      console.error('Error fetching action history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const logAdminAction = async (
    targetUserId: string, 
    actionType: string, 
    details?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('admin_action_history')
        .insert({
          admin_user_id: user.id,
          target_user_id: targetUserId,
          action_type: actionType,
          details: details || null,
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const updateUserStatus = async (userId: string, status: 'pending' | 'approved' | 'blocked') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      const actionType = status === 'approved' ? 'approve' : status === 'blocked' ? 'block' : 'set_pending';
      await logAdminAction(userId, actionType, `Status alterado para ${status}`);

      toast({
        title: 'Sucesso',
        description: `Usuário ${status === 'approved' ? 'aprovado' : status === 'blocked' ? 'bloqueado' : 'pendente'}`,
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do usuário',
        variant: 'destructive',
      });
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      // Verificar se já é admin
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (existing) {
        toast({ title: 'Info', description: 'Usuário já é administrador' });
        return;
      }

      // Usar INSERT ao invés de UPSERT
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;

      // Log the action
      await logAdminAction(userId, 'promote', 'Promovido a administrador');

      toast({
        title: 'Sucesso',
        description: 'Usuário promovido a administrador',
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível promover o usuário',
        variant: 'destructive',
      });
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      // Log the action
      await logAdminAction(userId, 'demote', 'Removido de administrador');

      toast({
        title: 'Sucesso',
        description: 'Permissão de admin removida',
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error demoting user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover admin',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    stats,
    actionHistory,
    loading,
    historyLoading,
    fetchUsers,
    fetchActionHistory,
    updateUserStatus,
    promoteToAdmin,
    demoteFromAdmin,
  };
}
