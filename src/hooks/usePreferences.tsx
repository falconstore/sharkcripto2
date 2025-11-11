import { create } from 'zustand';

interface PreferencesStore {
  favorites: Set<string>;
  blacklist: Set<string>;
  updateInterval: number;
  toggleFavorite: (symbol: string) => void;
  toggleBlacklist: (symbol: string) => void;
  setUpdateInterval: (interval: number) => void;
}

// Load from localStorage
const loadPreferences = (): { favorites: Set<string>; blacklist: Set<string>; updateInterval: number } => {
  try {
    const stored = localStorage.getItem('arbitrage-preferences');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        favorites: new Set<string>(parsed.favorites || []),
        blacklist: new Set<string>(parsed.blacklist || []),
        updateInterval: parsed.updateInterval || 3,
      };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return {
    favorites: new Set<string>(),
    blacklist: new Set<string>(),
    updateInterval: 3,
  };
};

// Save to localStorage
const savePreferences = (state: PreferencesStore) => {
  try {
    localStorage.setItem('arbitrage-preferences', JSON.stringify({
      favorites: Array.from(state.favorites),
      blacklist: Array.from(state.blacklist),
      updateInterval: state.updateInterval,
    }));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

export const usePreferences = create<PreferencesStore>((set) => ({
  ...loadPreferences(),
  toggleFavorite: (symbol) =>
    set((state) => {
      const newFavorites = new Set(state.favorites);
      if (newFavorites.has(symbol)) {
        newFavorites.delete(symbol);
      } else {
        newFavorites.add(symbol);
      }
      const newState = { ...state, favorites: newFavorites };
      savePreferences(newState);
      return { favorites: newFavorites };
    }),
  toggleBlacklist: (symbol) =>
    set((state) => {
      const newBlacklist = new Set(state.blacklist);
      const isAdding = !newBlacklist.has(symbol);
      
      if (isAdding) {
        newBlacklist.add(symbol);
        // Limpar dados do banco ao adicionar à blacklist (assíncrono, mas não bloqueia)
        import('@/lib/cleanupBlacklistedPair').then(({ cleanupBlacklistedPair }) => {
          cleanupBlacklistedPair(symbol);
        });
      } else {
        newBlacklist.delete(symbol);
      }
      
      const newState = { ...state, blacklist: newBlacklist };
      savePreferences(newState);
      return { blacklist: newBlacklist };
    }),
  setUpdateInterval: (interval) =>
    set((state) => {
      const newState = { ...state, updateInterval: interval };
      savePreferences(newState);
      return { updateInterval: interval };
    }),
}));
