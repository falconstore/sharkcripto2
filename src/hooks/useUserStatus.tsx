import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserStatus = 'pending' | 'approved' | 'blocked';

export function useUserStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStatus();
    } else {
      setStatus(null);
      setLoading(false);
    }
  }, [user?.id]);

  const fetchStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user status:', error);
        setStatus('pending');
      } else {
        setStatus((data?.status as UserStatus) || 'pending');
      }
    } catch (err) {
      console.error('Error fetching user status:', err);
      setStatus('pending');
    } finally {
      setLoading(false);
    }
  };

  return { 
    status, 
    loading, 
    isApproved: status === 'approved',
    isPending: status === 'pending',
    isBlocked: status === 'blocked',
    refetch: fetchStatus
  };
}
