import { create } from 'zustand';

interface MexcConfig {
  apiConfigured: boolean;
  minSpread: number;
  maxOperationValue: number;
  minSpotVolume: number;
  minFuturesVolume: number;
  simulationMode: boolean;
  autoConfirm: boolean;
  setApiConfigured: (configured: boolean) => void;
  setMinSpread: (value: number) => void;
  setMaxOperationValue: (value: number) => void;
  setMinSpotVolume: (value: number) => void;
  setMinFuturesVolume: (value: number) => void;
  setSimulationMode: (enabled: boolean) => void;
  setAutoConfirm: (enabled: boolean) => void;
}

export const useMexcConfig = create<MexcConfig>((set) => ({
  apiConfigured: true, // API keys configured via secrets
  minSpread: 0.5,
  maxOperationValue: 1000,
  minSpotVolume: 10000,
  minFuturesVolume: 10000,
  simulationMode: true,
  autoConfirm: false,
  setApiConfigured: (configured) => set({ apiConfigured: configured }),
  setMinSpread: (value) => set({ minSpread: value }),
  setMaxOperationValue: (value) => set({ maxOperationValue: value }),
  setMinSpotVolume: (value) => set({ minSpotVolume: value }),
  setMinFuturesVolume: (value) => set({ minFuturesVolume: value }),
  setSimulationMode: (enabled) => set({ simulationMode: enabled }),
  setAutoConfirm: (enabled) => set({ autoConfirm: enabled }),
}));
