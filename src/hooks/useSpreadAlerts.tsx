import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Opportunity } from './useOpportunities';

interface SpreadAlert {
  id: string;
  pair_symbol: string;
  target_spread: number;
  is_active: boolean;
}

export const useSpreadAlerts = () => {
  const queryClient = useQueryClient();

  const { data: alerts = [], refetch } = useQuery({
    queryKey: ['spread-alerts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('spread_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SpreadAlert[];
    }
  });

  const addMutation = useMutation({
    mutationFn: async ({ symbol, targetSpread }: { symbol: string; targetSpread: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('spread_alerts')
        .insert({
          user_id: user.id,
          pair_symbol: symbol,
          target_spread: targetSpread
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spread-alerts'] });
      toast.success(`Alerta criado para ${data.pair_symbol}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar alerta');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('spread_alerts')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spread-alerts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spread_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spread-alerts'] });
      toast.success('Alerta removido');
    }
  });

  const checkAlerts = (opportunities: Opportunity[]) => {
    if (!alerts.length) return;

    opportunities.forEach(opp => {
      const alert = alerts.find(a =>
        a.pair_symbol === opp.pair_symbol &&
        a.is_active &&
        opp.spread_net_percent >= a.target_spread
      );

      if (alert) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🎯 Alerta de Spread!', {
            body: `${opp.pair_symbol}: ${opp.spread_net_percent.toFixed(4)}% (alvo: ${alert.target_spread}%)`,
            icon: '/favicon.ico'
          });
        }

        toast.success(`🎯 ${opp.pair_symbol} atingiu ${opp.spread_net_percent.toFixed(4)}%!`, {
          description: `Alvo configurado: ${alert.target_spread}%`,
          duration: 10000
        });
      }
    });
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    alerts,
    addAlert: addMutation.mutate,
    toggleAlert: toggleMutation.mutate,
    deleteAlert: deleteMutation.mutate,
    checkAlerts,
    refetch
  };
};
