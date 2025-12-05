import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePreferences } from './usePreferences';
import { useNotificationSettings } from './useNotificationSettings';
import { toast } from 'sonner';

export const useCrossingNotifications = () => {
  const { favorites } = usePreferences();
  const { enabled, soundEnabled, volume, soundType } = useNotificationSettings();
  
  // Ref para armazenar favoritos sem causar re-renders do useEffect
  const favoritesRef = useRef<Set<string>>(favorites);
  const settingsRef = useRef({ soundEnabled, volume, soundType });
  
  // Debounce para evitar múltiplas notificações
  const lastNotificationRef = useRef<Map<string, number>>(new Map());
  const NOTIFICATION_DEBOUNCE_MS = 5000; // 5 segundos entre notificações da mesma moeda

  // Atualizar refs quando valores mudarem
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    settingsRef.current = { soundEnabled, volume, soundType };
  }, [soundEnabled, volume, soundType]);

  const playNotificationSound = useCallback(() => {
    const { soundEnabled, volume, soundType } = settingsRef.current;
    if (!soundEnabled) return;

    try {
      const audio = new Audio(`/sounds/${soundType}.mp3`);
      audio.volume = volume / 100;
      audio.play().catch(err => console.log('Erro ao tocar som:', err));
    } catch (error) {
      console.error('Erro ao criar áudio:', error);
    }
  }, []);

  const showNotification = useCallback((pairSymbol: string, spread: number) => {
    // Verificar debounce
    const now = Date.now();
    const lastTime = lastNotificationRef.current.get(pairSymbol) || 0;
    
    if (now - lastTime < NOTIFICATION_DEBOUNCE_MS) {
      return; // Ignorar notificação duplicada
    }

    // Verificar se está nos favoritos
    if (!favoritesRef.current.has(pairSymbol)) {
      return;
    }

    // Registrar timestamp da notificação
    lastNotificationRef.current.set(pairSymbol, now);

    // Disparar toast
    toast.success(`🚀 ${pairSymbol} cruzou!`, {
      description: `Saída: +${spread.toFixed(4)}%`,
      duration: 5000,
    });

    // Tocar som
    playNotificationSound();
  }, [playNotificationSound]);

  useEffect(() => {
    if (!enabled) return;

    console.log('Iniciando monitoramento de cruzamentos...');

    const channel = supabase
      .channel('crossings-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pair_crossings',
        },
        (payload) => {
          console.log('Novo cruzamento detectado:', payload);
          
          const crossing = payload.new as {
            pair_symbol: string;
            spread_net_percent_saida: number;
            timestamp: string;
          };

          showNotification(crossing.pair_symbol, crossing.spread_net_percent_saida);
        }
      )
      .subscribe((status) => {
        console.log('Status do canal de notificações:', status);
      });

    return () => {
      console.log('Desconectando canal de notificações...');
      supabase.removeChannel(channel);
    };
  }, [enabled, showNotification]);

  return { enabled };
};
