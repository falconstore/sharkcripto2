// Serviço para buscar volumes via REST API
export class VolumeService {
  private volumeCache: Map<string, number> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdate: number = 0;
  private readonly UPDATE_INTERVAL_MS = 60000; // Atualizar a cada minuto

  async fetchVolumes(): Promise<Map<string, number>> {
    try {
      console.log('📊 Volume: Buscando volumes 24h via REST API...');
      
      const response = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: any[] = await response.json();
      
      let count = 0;
      for (const ticker of data) {
        if (ticker.symbol && ticker.symbol.endsWith('USDT')) {
          const symbol = ticker.symbol.replace('USDT', '');
          const volume = parseFloat(ticker.quoteVolume) || 0;
          this.volumeCache.set(symbol, volume);
          count++;
        }
      }
      
      this.lastUpdate = Date.now();
      console.log(`✅ Volume: ${count} volumes atualizados`);
      
      return this.volumeCache;
    } catch (err) {
      console.error('❌ Volume: Erro ao buscar volumes:', (err as Error).message);
      return this.volumeCache;
    }
  }

  getVolume(symbol: string): number {
    return this.volumeCache.get(symbol) || 0;
  }

  hasVolume(symbol: string): boolean {
    return this.volumeCache.has(symbol);
  }

  startAutoUpdate() {
    // Buscar imediatamente
    this.fetchVolumes();
    
    // Atualizar periodicamente
    this.updateInterval = setInterval(() => {
      this.fetchVolumes();
    }, this.UPDATE_INTERVAL_MS);
    
    console.log(`⏱️ Volume: Auto-update iniciado (${this.UPDATE_INTERVAL_MS / 1000}s)`);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getStats() {
    return {
      cachedSymbols: this.volumeCache.size,
      lastUpdate: this.lastUpdate,
      age: Date.now() - this.lastUpdate
    };
  }
}
