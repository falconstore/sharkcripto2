import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Opportunity } from '../types';

export class SupabaseService {
  private client: SupabaseClient;
  private pendingOpportunities: Map<string, Opportunity> = new Map();
  private saveInterval: NodeJS.Timeout | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    }

    this.client = createClient(url, key);
    console.log('✅ Supabase conectado');
  }

  startAutoSave(intervalMs: number = 1000) {
    this.saveInterval = setInterval(() => this.flushOpportunities(), intervalMs);
    console.log(`⏱️ Auto-save iniciado (${intervalMs}ms)`);
  }

  stopAutoSave() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  queueOpportunity(opportunity: Opportunity) {
    this.pendingOpportunities.set(opportunity.pair_symbol, opportunity);
  }

  private async flushOpportunities() {
    if (this.pendingOpportunities.size === 0) return;

    const opportunities = Array.from(this.pendingOpportunities.values());
    this.pendingOpportunities.clear();

    try {
      // Primeiro, marcar todas as oportunidades antigas como inativas
      await this.client
        .from('arbitrage_opportunities')
        .update({ is_active: false })
        .eq('is_active', true);

      // Inserir novas oportunidades
      const { error } = await this.client
        .from('arbitrage_opportunities')
        .insert(opportunities);

      if (error) {
        console.error('❌ Erro ao salvar oportunidades:', error.message);
      } else {
        console.log(`💾 ${opportunities.length} oportunidades salvas`);
      }
    } catch (err) {
      console.error('❌ Erro ao salvar:', err);
    }
  }

  async saveCrossing(pairSymbol: string, spreadNetSaida: number) {
    try {
      const { error } = await this.client
        .from('pair_crossings')
        .insert({
          pair_symbol: pairSymbol,
          spread_net_percent_saida: spreadNetSaida,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erro ao salvar cruzamento:', error.message);
      } else {
        console.log(`🔄 Cruzamento salvo: ${pairSymbol}`);
      }
    } catch (err) {
      console.error('❌ Erro ao salvar cruzamento:', err);
    }
  }

  async getBlacklist(): Promise<string[]> {
    try {
      const { data } = await this.client
        .from('pair_crossings')
        .select('pair_symbol')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      // Pares com mais de 3 cruzamentos na última hora
      const counts = new Map<string, number>();
      data?.forEach(row => {
        counts.set(row.pair_symbol, (counts.get(row.pair_symbol) || 0) + 1);
      });

      return Array.from(counts.entries())
        .filter(([_, count]) => count > 3)
        .map(([symbol]) => symbol);
    } catch {
      return [];
    }
  }
}
