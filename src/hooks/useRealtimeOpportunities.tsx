import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOpportunities, Opportunity } from './useOpportunities';

export function useRealtimeOpportunities() {
  const { setOpportunities, opportunities } = useOpportunities();

  // Carregar oportunidades iniciais do banco
  const loadInitialOpportunities = useCallback(async () => {
    const { data, error } = await supabase
      .from('arbitrage_opportunities')
      .select('*')
      .eq('is_active', true)
      .order('spread_net_percent', { ascending: false });

    if (error) {
      console.error('Erro ao carregar oportunidades:', error);
      return;
    }

    if (data) {
      const mapped: Opportunity[] = data.map(row => ({
        id: row.id,
        pair_symbol: row.pair_symbol,
        spot_bid_price: Number(row.spot_bid_price),
        spot_volume_24h: Number(row.spot_volume_24h),
        futures_ask_price: Number(row.futures_ask_price),
        futures_volume_24h: Number(row.futures_volume_24h),
        spread_gross_percent: Number(row.spread_gross_percent),
        spread_net_percent: Number(row.spread_net_percent),
        spread_net_percent_entrada: Number(row.spread_net_percent_entrada) || 0,
        spread_net_percent_saida: Number(row.spread_net_percent_saida) || 0,
        spot_taker_fee: Number(row.spot_taker_fee),
        futures_taker_fee: Number(row.futures_taker_fee),
        funding_rate: Number(row.funding_rate) || 0,
        timestamp: row.timestamp || '',
        is_active: row.is_active ?? true,
        created_at: row.created_at || ''
      }));

      setOpportunities(mapped);
    }
  }, [setOpportunities]);

  // Configurar subscription Realtime
  useEffect(() => {
    // Carregar dados iniciais
    loadInitialOpportunities();

    // Subscription para INSERT (novas oportunidades)
    const channel = supabase
      .channel('arbitrage-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'arbitrage_opportunities'
        },
        (payload) => {
          const row = payload.new as any;
          
          const newOpp: Opportunity = {
            id: row.id,
            pair_symbol: row.pair_symbol,
            spot_bid_price: Number(row.spot_bid_price),
            spot_volume_24h: Number(row.spot_volume_24h),
            futures_ask_price: Number(row.futures_ask_price),
            futures_volume_24h: Number(row.futures_volume_24h),
            spread_gross_percent: Number(row.spread_gross_percent),
            spread_net_percent: Number(row.spread_net_percent),
            spread_net_percent_entrada: Number(row.spread_net_percent_entrada) || 0,
            spread_net_percent_saida: Number(row.spread_net_percent_saida) || 0,
            spot_taker_fee: Number(row.spot_taker_fee),
            futures_taker_fee: Number(row.futures_taker_fee),
            funding_rate: Number(row.funding_rate) || 0,
            timestamp: row.timestamp || '',
            is_active: row.is_active ?? true,
            created_at: row.created_at || ''
          };

          // Atualizar ou adicionar
          useOpportunities.setState(state => {
            const existing = state.opportunities.findIndex(o => o.pair_symbol === newOpp.pair_symbol);
            
            if (existing >= 0) {
              const updated = [...state.opportunities];
              updated[existing] = newOpp;
              return { opportunities: updated };
            }
            
            return { opportunities: [...state.opportunities, newOpp] };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'arbitrage_opportunities'
        },
        (payload) => {
          const row = payload.new as any;
          
          // Se foi marcado como inativo, remover da lista
          if (!row.is_active) {
            useOpportunities.setState(state => ({
              opportunities: state.opportunities.filter(o => o.id !== row.id)
            }));
            return;
          }

          // Atualizar oportunidade existente
          useOpportunities.setState(state => {
            const updated = state.opportunities.map(o => {
              if (o.pair_symbol === row.pair_symbol) {
                return {
                  ...o,
                  spot_bid_price: Number(row.spot_bid_price),
                  spot_volume_24h: Number(row.spot_volume_24h),
                  futures_ask_price: Number(row.futures_ask_price),
                  futures_volume_24h: Number(row.futures_volume_24h),
                  spread_gross_percent: Number(row.spread_gross_percent),
                  spread_net_percent: Number(row.spread_net_percent),
                  spread_net_percent_entrada: Number(row.spread_net_percent_entrada) || 0,
                  spread_net_percent_saida: Number(row.spread_net_percent_saida) || 0,
                  funding_rate: Number(row.funding_rate) || 0,
                  timestamp: row.timestamp || ''
                };
              }
              return o;
            });
            
            return { opportunities: updated };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadInitialOpportunities]);

  return {
    opportunities,
    refresh: loadInitialOpportunities
  };
}
