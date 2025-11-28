import { create } from 'zustand';

export interface Opportunity {
  id?: string;
  pair_symbol: string;
  spot_bid_price: number;
  spot_volume_24h: number;
  futures_ask_price: number;
  futures_volume_24h: number;
  spread_gross_percent: number;
  spread_net_percent: number;
  spread_net_percent_entrada: number; // LONG: Comprar Spot + Vender Futures
  spread_net_percent_saida: number;   // SHORT: Vender Spot + Comprar Futures
  spot_taker_fee: number;
  futures_taker_fee: number;
  funding_rate?: number; // Taxa de financiamento do contrato futuro
  timestamp: string;
  is_active?: boolean;
  created_at?: string;
}

interface OpportunitiesStore {
  opportunities: Opportunity[];
  setOpportunities: (opportunities: Opportunity[]) => void;
  clearOpportunities: () => void;
}

export const useOpportunities = create<OpportunitiesStore>((set) => ({
  opportunities: [],
  setOpportunities: (opportunities) => set({ opportunities }),
  clearOpportunities: () => set({ opportunities: [] }),
}));
