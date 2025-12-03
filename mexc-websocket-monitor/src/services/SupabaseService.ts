import { Opportunity } from '../types';

export class SupabaseService {
  private functionsUrl: string;
  private apiKey: string;
  private pendingOpportunities: Map<string, Opportunity> = new Map();
  private saveInterval: NodeJS.Timeout | null = null;

  constructor() {
    const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL;
    const apiKey = process.env.MONITOR_API_KEY;

    if (!functionsUrl || !apiKey) {
      throw new Error('SUPABASE_FUNCTIONS_URL e MONITOR_API_KEY são obrigatórios');
    }

    this.functionsUrl = functionsUrl;
    this.apiKey = apiKey;
    console.log('✅ Serviço configurado para usar Edge Function');
  }

  private async callEdgeFunction(action: string, data: any): Promise<any> {
    const response = await fetch(`${this.functionsUrl}/websocket-receiver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-monitor-api-key': this.apiKey
      },
      body: JSON.stringify({ action, data })
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
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
      const result = await this.callEdgeFunction('save_opportunities', opportunities);
      console.log(`💾 ${result.count || opportunities.length} oportunidades salvas`);
    } catch (err) {
      console.error('❌ Erro ao salvar oportunidades:', err);
    }
  }

  async saveCrossing(pairSymbol: string, spreadNetSaida: number) {
    try {
      await this.callEdgeFunction('save_crossing', {
        pair_symbol: pairSymbol,
        spread_net_percent_saida: spreadNetSaida,
        timestamp: new Date().toISOString()
      });
      console.log(`🔄 Cruzamento salvo: ${pairSymbol}`);
    } catch (err) {
      console.error('❌ Erro ao salvar cruzamento:', err);
    }
  }

  async getBlacklist(): Promise<string[]> {
    try {
      const result = await this.callEdgeFunction('get_blacklist', {});
      return result.blacklist || [];
    } catch (err) {
      console.error('❌ Erro ao buscar blacklist:', err);
      return [];
    }
  }
}
