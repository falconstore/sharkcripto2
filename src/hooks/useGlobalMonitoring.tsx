import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useOpportunities } from './useOpportunities';

interface MonitoringStore {
  isRunning: boolean;
  intervalId: number | null;
  updateInterval: number;
  startMonitoring: (interval: number) => Promise<void>;
  stopMonitoring: () => void;
  setUpdateInterval: (interval: number) => void;
}

export const useGlobalMonitoring = create<MonitoringStore>((set, get) => ({
  isRunning: false,
  intervalId: null,
  updateInterval: 3,
  
  startMonitoring: async (interval: number) => {
    const callMonitor = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mexc-arbitrage-monitor', {
          method: 'POST'
        });

        if (error) {
          console.error('Error calling monitor:', error);
          return;
        }

        if (data?.opportunities) {
          useOpportunities.getState().setOpportunities(data.opportunities);
        }
      } catch (error) {
        console.error('Error calling monitor:', error);
      }
    };
    
    // Primeira chamada imediata
    await callMonitor();
    
    // Configurar intervalo
    const id = window.setInterval(callMonitor, interval * 1000);
    
    set({ isRunning: true, intervalId: id, updateInterval: interval });
  },
  
  stopMonitoring: () => {
    const { intervalId } = get();
    if (intervalId) {
      window.clearInterval(intervalId);
    }
    useOpportunities.getState().clearOpportunities();
    set({ isRunning: false, intervalId: null });
  },
  
  setUpdateInterval: (interval: number) => set({ updateInterval: interval })
}));
