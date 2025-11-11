import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePreferences } from './usePreferences';
import { useNotificationSettings } from './useNotificationSettings';
import { toast } from 'sonner';

export const useCrossingNotifications = () => {
  const { favorites } = usePreferences();
  const { enabled, soundEnabled, volume, soundType } = useNotificationSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = () => {
    if (!soundEnabled) return;

    try {
      // Create audio element on demand
      const audio = new Audio(`/sounds/${soundType}.mp3`);
      audio.volume = volume / 100;
      audio.play().catch(err => console.log('Erro ao tocar som:', err));
    } catch (error) {
      console.error('Erro ao criar áudio:', error);
    }
  };

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

          // Verificar se está nos favoritos
          if (favorites.has(crossing.pair_symbol)) {
            // Disparar toast
            toast.success(`🚀 ${crossing.pair_symbol} cruzou!`, {
              description: `Saída: +${crossing.spread_net_percent_saida.toFixed(4)}%`,
              duration: 5000,
            });

            // Tocar som
            playNotificationSound();
          }
        }
      )
      .subscribe((status) => {
        console.log('Status do canal de notificações:', status);
      });

    return () => {
      console.log('Desconectando canal de notificações...');
      supabase.removeChannel(channel);
    };
  }, [favorites, enabled, soundEnabled, volume, soundType]);

  return { enabled };
};
