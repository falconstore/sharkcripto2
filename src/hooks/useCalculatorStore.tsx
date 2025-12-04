import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CalculatorData {
  id: string;
  selectedPair: string;
  valorInvestido: string;
  entradaSpot: string;
  entradaFuturo: string;
  fechamentoSpot: string;
  fechamentoFuturo: string;
  trackingActive: boolean;
  order: number;
  profitThresholdPercent: number; // Threshold individual em %
  currentProfit: number; // Lucro atual para estatísticas
}

interface CalculatorStore {
  calculators: CalculatorData[];
  soundEnabled: boolean;
  addCalculator: () => void;
  removeCalculator: (id: string) => void;
  updateCalculator: (id: string, data: Partial<CalculatorData>) => void;
  reorderCalculators: (startIndex: number, endIndex: number) => void;
  toggleSound: () => void;
  getTotalProfit: () => number;
  setCalculators: (calculators: CalculatorData[]) => void;
}

const createEmptyCalculator = (order: number): CalculatorData => ({
  id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  selectedPair: '',
  valorInvestido: '',
  entradaSpot: '',
  entradaFuturo: '',
  fechamentoSpot: '',
  fechamentoFuturo: '',
  trackingActive: false,
  order,
  profitThresholdPercent: 0.1, // Default 0.1%
  currentProfit: 0,
});

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
      calculators: [createEmptyCalculator(0)],
      soundEnabled: true,

      addCalculator: () => {
        const { calculators } = get();
        const newOrder = calculators.length;
        set({
          calculators: [...calculators, createEmptyCalculator(newOrder)],
        });
      },

      removeCalculator: (id: string) => {
        const { calculators } = get();
        if (calculators.length > 1) {
          const filtered = calculators
            .filter((c) => c.id !== id)
            .map((c, index) => ({ ...c, order: index }));
          set({ calculators: filtered });
        }
      },

      updateCalculator: (id: string, data: Partial<CalculatorData>) => {
        const { calculators } = get();
        set({
          calculators: calculators.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        });
      },

      reorderCalculators: (startIndex: number, endIndex: number) => {
        const { calculators } = get();
        const result = Array.from(calculators);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        set({
          calculators: result.map((c, index) => ({ ...c, order: index })),
        });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      getTotalProfit: () => {
        const { calculators } = get();
        return calculators.reduce((sum, calc) => sum + (calc.currentProfit || 0), 0);
      },

      setCalculators: (calculators: CalculatorData[]) => {
        set({ calculators });
      },
    }),
    {
      name: 'calculator-storage',
    }
  )
);
