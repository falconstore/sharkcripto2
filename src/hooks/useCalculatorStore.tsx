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
}

interface CalculatorStore {
  calculators: CalculatorData[];
  profitThreshold: number;
  soundEnabled: boolean;
  addCalculator: () => void;
  removeCalculator: (id: string) => void;
  updateCalculator: (id: string, data: Partial<CalculatorData>) => void;
  reorderCalculators: (startIndex: number, endIndex: number) => void;
  setProfitThreshold: (value: number) => void;
  toggleSound: () => void;
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
});

export const useCalculatorStore = create<CalculatorStore>()(
  persist(
    (set, get) => ({
      calculators: [createEmptyCalculator(0)],
      profitThreshold: 1,
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

      setProfitThreshold: (value: number) => {
        set({ profitThreshold: value });
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },
    }),
    {
      name: 'calculator-storage',
    }
  )
);
