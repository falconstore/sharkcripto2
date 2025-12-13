import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
}

interface UseMaintenanceModeReturn {
  isMaintenanceMode: boolean;
  message: string;
  loading: boolean;
  toggleMaintenanceMode: (enabled: boolean, message?: string) => Promise<void>;
}

export function useMaintenanceMode(): UseMaintenanceModeReturn {
  const [config, setConfig] = useState<MaintenanceConfig>({ enabled: false, message: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceMode = async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();

        if (error) {
          console.error('Error fetching maintenance mode:', error);
          setConfig({ enabled: false, message: '' });
        } else if (data?.value) {
          const value = data.value as unknown as MaintenanceConfig;
          setConfig({
            enabled: value.enabled ?? false,
            message: value.message ?? 'Sistema em manutenção. Voltamos em breve!'
          });
        }
      } catch (error) {
        console.error('Error fetching maintenance mode:', error);
        setConfig({ enabled: false, message: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceMode();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('system_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_config',
          filter: 'key=eq.maintenance_mode'
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const value = payload.new.value as MaintenanceConfig;
            setConfig({
              enabled: value.enabled ?? false,
              message: value.message ?? 'Sistema em manutenção. Voltamos em breve!'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleMaintenanceMode = async (enabled: boolean, message?: string) => {
    const newConfig: MaintenanceConfig = {
      enabled,
      message: message ?? config.message
    };

    const { error } = await supabase
      .from('system_config')
      .update({ 
        value: newConfig as unknown as Record<string, never>,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'maintenance_mode');

    if (error) {
      console.error('Error updating maintenance mode:', error);
      throw error;
    }

    setConfig(newConfig);
  };

  return {
    isMaintenanceMode: config.enabled,
    message: config.message,
    loading,
    toggleMaintenanceMode
  };
}
