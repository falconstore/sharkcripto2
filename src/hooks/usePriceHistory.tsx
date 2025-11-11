import { create } from 'zustand';

interface PricePoint {
  timestamp: number;
  spread: number;
}

interface PriceHistoryStore {
  history: Record<string, PricePoint[]>;
  addPoint: (symbol: string, spread: number) => void;
  getHistory: (symbol: string, minutes: number) => PricePoint[];
}

const MAX_POINTS = 300; // 5 minutos * 60 pontos/min

export const usePriceHistory = create<PriceHistoryStore>((set, get) => ({
  history: {},
  
  addPoint: (symbol, spread) => {
    set(state => {
      const current = state.history[symbol] || [];
      const newPoint = { timestamp: Date.now(), spread };
      const updated = [...current, newPoint].slice(-MAX_POINTS);
      
      return {
        history: {
          ...state.history,
          [symbol]: updated
        }
      };
    });
  },
  
  getHistory: (symbol, minutes) => {
    const { history } = get();
    const points = history[symbol] || [];
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return points.filter(p => p.timestamp >= cutoff);
  }
}));
