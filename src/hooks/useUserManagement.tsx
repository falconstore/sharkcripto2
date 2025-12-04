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
}

export interface UserStats {
  total: number;
  pending: number;
  approved: number;
  blocked: number;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats>({ total: 0, pending: 0, approved: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedUsers = (data || []).map(user => ({
        ...user,
        status: (user.status as 'pending' | 'approved' | 'blocked') || 'pending'
      }));

      setUsers(typedUsers);
      
      // Calculate stats
      const newStats: UserStats = {
        total: typedUsers.length,
        pending: typedUsers.filter(u => u.status === 'pending').length,
        approved: typedUsers.filter(u => u.status === 'approved').length,
        blocked: typedUsers.filter(u => u.status === 'blocked').length,
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

  const updateUserStatus = async (userId: string, status: 'pending' | 'approved' | 'blocked') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    stats,
    loading,
    fetchUsers,
    updateUserStatus,
  };
}
