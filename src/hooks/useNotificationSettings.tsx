import { create } from 'zustand';

interface NotificationSettingsStore {
  enabled: boolean;
  soundEnabled: boolean;
  volume: number;
  soundType: 'notification' | 'alert';
  toggleEnabled: () => void;
  toggleSoundEnabled: () => void;
  setVolume: (volume: number) => void;
  setSoundType: (type: 'notification' | 'alert') => void;
}

const loadSettings = () => {
  try {
    const stored = localStorage.getItem('notification-settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        enabled: parsed.enabled ?? true,
        soundEnabled: parsed.soundEnabled ?? true,
        volume: parsed.volume ?? 80,
        soundType: parsed.soundType ?? 'notification',
      };
    }
  } catch (error) {
    console.error('Erro ao carregar configurações de notificação:', error);
  }
  return {
    enabled: true,
    soundEnabled: true,
    volume: 80,
    soundType: 'notification' as const,
  };
};

const saveSettings = (state: NotificationSettingsStore) => {
  try {
    localStorage.setItem('notification-settings', JSON.stringify({
      enabled: state.enabled,
      soundEnabled: state.soundEnabled,
      volume: state.volume,
      soundType: state.soundType,
    }));
  } catch (error) {
    console.error('Erro ao salvar configurações de notificação:', error);
  }
};

export const useNotificationSettings = create<NotificationSettingsStore>((set) => ({
  ...loadSettings(),
  toggleEnabled: () =>
    set((state) => {
      const newState = { ...state, enabled: !state.enabled };
      saveSettings(newState);
      return { enabled: !state.enabled };
    }),
  toggleSoundEnabled: () =>
    set((state) => {
      const newState = { ...state, soundEnabled: !state.soundEnabled };
      saveSettings(newState);
      return { soundEnabled: !state.soundEnabled };
    }),
  setVolume: (volume) =>
    set((state) => {
      const newState = { ...state, volume };
      saveSettings(newState);
      return { volume };
    }),
  setSoundType: (soundType) =>
    set((state) => {
      const newState = { ...state, soundType };
      saveSettings(newState);
      return { soundType };
    }),
}));
