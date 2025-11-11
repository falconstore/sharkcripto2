import { supabase } from '@/integrations/supabase/client';

export async function cleanupBlacklistedPair(symbol: string) {
  try {
    // Deletar todos os cruzamentos da moeda
    const { error } = await supabase
      .from('pair_crossings')
      .delete()
      .eq('pair_symbol', symbol);
    
    if (error) throw error;
    
    console.log(`Histórico de ${symbol} limpo com sucesso`);
    return true;
  } catch (error) {
    console.error(`Erro ao limpar ${symbol}:`, error);
    return false;
  }
}
