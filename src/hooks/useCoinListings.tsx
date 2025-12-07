import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CoinListing {
  id: string;
  coin_name: string;
  pair_symbol: string;
  listing_type: 'new' | 'delist';
  scheduled_date: string;
  notified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCoinListings = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<CoinListing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('coin_listings')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setListings((data as CoinListing[]) || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('coin_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coin_listings'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newListing = payload.new as CoinListing;
            setListings(prev => [...prev, newListing]);
            
            // Show notification for new listings
            if (newListing.listing_type === 'new') {
              const scheduledDate = new Date(newListing.scheduled_date);
              const now = new Date();
              
              if (scheduledDate <= now) {
                toast.success(`🚀 Nova moeda listada: ${newListing.coin_name} (${newListing.pair_symbol})`, {
                  duration: 10000,
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setListings(prev => 
              prev.map(l => l.id === payload.new.id ? payload.new as CoinListing : l)
            );
          } else if (payload.eventType === 'DELETE') {
            setListings(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings]);

  const addListing = async (listing: Omit<CoinListing, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'notified'>) => {
    if (!user?.id) {
      toast.error('Você precisa estar logado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('coin_listings')
        .insert({
          ...listing,
          created_by: user.id,
        });

      if (error) throw error;
      toast.success('Listagem adicionada com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Error adding listing:', err);
      toast.error(err.message || 'Erro ao adicionar listagem');
      return false;
    }
  };

  const updateListing = async (id: string, updates: Partial<CoinListing>) => {
    try {
      const { error } = await supabase
        .from('coin_listings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Listagem atualizada com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Error updating listing:', err);
      toast.error(err.message || 'Erro ao atualizar listagem');
      return false;
    }
  };

  const deleteListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coin_listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Listagem removida com sucesso!');
      return true;
    } catch (err: any) {
      console.error('Error deleting listing:', err);
      toast.error(err.message || 'Erro ao remover listagem');
      return false;
    }
  };

  // Normalize symbol for comparison (handles BTC_USDT vs BTCUSDT)
  const normalizeSymbol = (symbol: string): string => 
    symbol.replace('_', '').toUpperCase();

  // Check if a coin is new (listed in last 24h)
  const isNewCoin = useCallback((pairSymbol: string): boolean => {
    const normalizedInput = normalizeSymbol(pairSymbol);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return listings.some(
      l => normalizeSymbol(l.pair_symbol) === normalizedInput && 
           l.listing_type === 'new' && 
           new Date(l.scheduled_date) >= twentyFourHoursAgo &&
           new Date(l.scheduled_date) <= now
    );
  }, [listings]);

  // Get delisting info for a coin
  const getDelistingInfo = useCallback((pairSymbol: string): CoinListing | null => {
    const normalizedInput = normalizeSymbol(pairSymbol);
    const now = new Date();
    
    return listings.find(
      l => normalizeSymbol(l.pair_symbol) === normalizedInput && 
           l.listing_type === 'delist' && 
           new Date(l.scheduled_date) > now
    ) || null;
  }, [listings]);

  // Get new listings
  const newListings = listings.filter(l => l.listing_type === 'new');
  
  // Get delistings
  const delistings = listings.filter(l => l.listing_type === 'delist');

  return {
    listings,
    newListings,
    delistings,
    loading,
    addListing,
    updateListing,
    deleteListing,
    isNewCoin,
    getDelistingInfo,
    refetch: fetchListings,
  };
};
