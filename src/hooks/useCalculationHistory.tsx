import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalculationRecord {
  id?: string;
  pair_symbol: string | null;
  valor_investido: number;
  entrada_spot: number;
  entrada_futuro: number;
  fechamento_spot: number | null;
  fechamento_futuro: number | null;
  lucro_usd: number;
  lucro_brl: number;
  var_entrada: number;
  var_fechamento: number;
  var_total: number;
  exchange_rate: number;
  created_at?: string;
}

export const useCalculationHistory = () => {
  const queryClient = useQueryClient();

  const { data: history = [], refetch } = useQuery({
    queryKey: ['calculation-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('calculation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CalculationRecord[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (calculation: Omit<CalculationRecord, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('calculation_history')
        .insert({
          user_id: user.id,
          ...calculation
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-history'] });
      toast.success('Cálculo salvo no histórico!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar cálculo');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calculation_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculation-history'] });
      toast.success('Cálculo removido do histórico');
    }
  });

  return {
    history,
    saveCalculation: saveMutation.mutate,
    deleteCalculation: deleteMutation.mutate,
    refetch
  };
};
