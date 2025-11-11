import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankrollOperation {
  id?: string;
  operation_type: 'trade' | 'deposit' | 'withdrawal';
  operation_date?: string;
  amount_usdt: number;
  profit_usdt?: number;
  profit_brl?: number;
  pair_symbol?: string;
  notes?: string;
  calculation_id?: string;
}

export interface BankrollStats {
  currentBalance: number;
  totalProfit: number;
  totalProfitBRL: number;
  roi: number;
  totalTrades: number;
  winningTrades: number;
  avgProfitPerTrade: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

export const useBankroll = () => {
  const queryClient = useQueryClient();
  
  // Buscar configuração
  const { data: config } = useQuery({
    queryKey: ['bankroll-config'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('bankroll_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return data;
    }
  });
  
  // Buscar histórico de operações
  const { data: operations = [] } = useQuery({
    queryKey: ['bankroll-operations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('bankroll_management')
        .select('*')
        .eq('user_id', user.id)
        .order('operation_date', { ascending: false });
      
      return data || [];
    }
  });
  
  // Calcular estatísticas
  const stats: BankrollStats = {
    currentBalance: config?.initial_balance_usdt || 0,
    totalProfit: 0,
    totalProfitBRL: 0,
    roi: 0,
    totalTrades: 0,
    winningTrades: 0,
    avgProfitPerTrade: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  };
  
  operations.forEach(op => {
    if (op.operation_type === 'trade') {
      stats.totalTrades++;
      stats.totalProfit += op.profit_usdt || 0;
      stats.totalProfitBRL += op.profit_brl || 0;
      if ((op.profit_usdt || 0) > 0) stats.winningTrades++;
    } else if (op.operation_type === 'deposit') {
      stats.currentBalance += op.amount_usdt;
      stats.totalDeposits += op.amount_usdt;
    } else if (op.operation_type === 'withdrawal') {
      stats.currentBalance -= op.amount_usdt;
      stats.totalWithdrawals += op.amount_usdt;
    }
  });
  
  stats.currentBalance += stats.totalProfit;
  stats.roi = config?.initial_balance_usdt 
    ? (stats.totalProfit / config.initial_balance_usdt) * 100 
    : 0;
  stats.avgProfitPerTrade = stats.totalTrades > 0 
    ? stats.totalProfit / stats.totalTrades 
    : 0;
  
  // Salvar configuração inicial
  const saveConfigMutation = useMutation({
    mutationFn: async (initialBalance: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { data } = await supabase
        .from('bankroll_config')
        .upsert({ 
          user_id: user.id, 
          initial_balance_usdt: initialBalance 
        })
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankroll-config'] });
      toast.success('Banca configurada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao configurar banca', {
        description: error.message
      });
    }
  });
  
  // Adicionar operação
  const addOperationMutation = useMutation({
    mutationFn: async (operation: BankrollOperation) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { data } = await supabase
        .from('bankroll_management')
        .insert({ 
          ...operation, 
          user_id: user.id,
          operation_date: operation.operation_date || new Date().toISOString()
        })
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankroll-operations'] });
      toast.success('Operação registrada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar operação', {
        description: error.message
      });
    }
  });
  
  // Deletar operação
  const deleteOperationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bankroll_management')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankroll-operations'] });
      toast.success('Operação deletada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao deletar operação', {
        description: error.message
      });
    }
  });
  
  return {
    config,
    operations,
    stats,
    saveConfig: saveConfigMutation.mutate,
    addOperation: addOperationMutation.mutate,
    deleteOperation: deleteOperationMutation.mutate,
    isLoadingConfig: saveConfigMutation.isPending,
  };
};
