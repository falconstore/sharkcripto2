import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCalculatorStore, CalculatorData } from './useCalculatorStore';
import { toast } from 'sonner';

export const useUserCalculators = () => {
  const { user } = useAuth();
  const { calculators, setCalculators } = useCalculatorStore();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);
  const lastSyncedRef = useRef<string>('');

  // Load calculators from database
  const loadFromDatabase = useCallback(async () => {
    if (!user || isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('user_calculators')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading calculators:', error);
        return;
      }

      if (data && data.length > 0) {
        const loadedCalculators: CalculatorData[] = data.map(calc => ({
          id: calc.calculator_id,
          selectedPair: calc.selected_pair || '',
          valorInvestido: calc.valor_investido || '',
          entradaSpot: calc.entrada_spot || '',
          entradaFuturo: calc.entrada_futuro || '',
          fechamentoSpot: calc.fechamento_spot || '',
          fechamentoFuturo: calc.fechamento_futuro || '',
          trackingActive: calc.tracking_active || false,
          order: calc.order_index || 0,
          profitThresholdPercent: Number(calc.profit_threshold_percent) || 0.1,
          currentProfit: 0,
        }));
        
        setCalculators(loadedCalculators);
        lastSyncedRef.current = JSON.stringify(loadedCalculators);
        console.log('✅ Calculadoras carregadas do banco:', loadedCalculators.length);
      }
    } catch (err) {
      console.error('Error loading calculators:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, setCalculators]);

  // Save calculators to database (debounced)
  const saveToDatabase = useCallback(async (calcs: CalculatorData[]) => {
    if (!user) return;

    const currentState = JSON.stringify(calcs.map(c => ({
      ...c,
      currentProfit: 0 // Ignore currentProfit for comparison
    })));
    
    // Skip if nothing changed
    if (currentState === lastSyncedRef.current) return;

    try {
      // Delete existing calculators for this user
      await supabase
        .from('user_calculators')
        .delete()
        .eq('user_id', user.id);

      // Insert new calculators
      const records = calcs.map(calc => ({
        user_id: user.id,
        calculator_id: calc.id,
        selected_pair: calc.selectedPair || null,
        valor_investido: calc.valorInvestido || null,
        entrada_spot: calc.entradaSpot || null,
        entrada_futuro: calc.entradaFuturo || null,
        fechamento_spot: calc.fechamentoSpot || null,
        fechamento_futuro: calc.fechamentoFuturo || null,
        tracking_active: calc.trackingActive,
        order_index: calc.order,
        profit_threshold_percent: calc.profitThresholdPercent,
      }));

      const { error } = await supabase
        .from('user_calculators')
        .insert(records);

      if (error) {
        console.error('Error saving calculators:', error);
      } else {
        lastSyncedRef.current = currentState;
        console.log('✅ Calculadoras salvas no banco:', records.length);
      }
    } catch (err) {
      console.error('Error saving calculators:', err);
    }
  }, [user]);

  // Debounced save function
  const debouncedSave = useCallback((calcs: CalculatorData[]) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      saveToDatabase(calcs);
    }, 2000); // 2 second debounce
  }, [saveToDatabase]);

  // Load on mount and user change
  useEffect(() => {
    if (user) {
      loadFromDatabase();
    }
  }, [user, loadFromDatabase]);

  // Save when calculators change
  useEffect(() => {
    if (user && calculators.length > 0 && !isLoadingRef.current) {
      debouncedSave(calculators);
    }
  }, [calculators, user, debouncedSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadFromDatabase,
    saveToDatabase: () => saveToDatabase(calculators),
  };
};
