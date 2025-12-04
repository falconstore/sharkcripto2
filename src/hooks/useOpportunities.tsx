import { create } from 'zustand';

export interface Opportunity {
  id?: string;
  pair_symbol: string;
  // Preços para SAÍDA (Reverse Cash and Carry)
  spot_bid_price: number;       // Vende Spot - recebe BID
  futures_ask_price: number;    // Compra Futures - paga ASK
  // Preços para ENTRADA (Cash and Carry)
  spot_ask_price?: number;      // Compra Spot - paga ASK
  futures_bid_price?: number;   // Vende Futures - recebe BID
  // Volumes
  spot_volume_24h: number;
  futures_volume_24h: number;
  // Spreads
  spread_gross_percent: number;
  spread_net_percent: number;
  spread_net_percent_entrada: number; // LONG: Comprar Spot + Vender Futures
  spread_net_percent_saida: number;   // SHORT: Vender Spot + Comprar Futures
  // Taxas
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
