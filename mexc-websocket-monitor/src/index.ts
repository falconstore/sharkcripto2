import 'dotenv/config';
import { SpotWebSocket } from './websocket/SpotWebSocket';
import { FuturesWebSocket } from './websocket/FuturesWebSocket';
import { SpreadCalculator } from './services/SpreadCalculator';
import { SupabaseService } from './services/SupabaseService';

const MIN_VOLUME_24H = parseFloat(process.env.MIN_VOLUME_24H || '100000');
const SAVE_INTERVAL_MS = parseInt(process.env.SAVE_INTERVAL_MS || '1000');

class MexcArbitrageMonitor {
  private spotWs: SpotWebSocket;
  private futuresWs: FuturesWebSocket;
  private calculator: SpreadCalculator;
  private supabase: SupabaseService;
  private symbols: string[] = [];

  constructor() {
    this.spotWs = new SpotWebSocket();
    this.futuresWs = new FuturesWebSocket();
    this.calculator = new SpreadCalculator();
    this.supabase = new SupabaseService();
  }

  async start() {
    console.log('🚀 Iniciando MEXC Arbitrage Monitor...\n');

    // Buscar lista de pares
    await this.fetchSymbols();

    // Carregar blacklist
    const blacklist = await this.supabase.getBlacklist();
    this.calculator.setBlacklist(blacklist);
    console.log(`🚫 Blacklist: ${blacklist.length} pares\n`);

    // Configurar handlers
    this.setupHandlers();

    // Conectar WebSockets
    await Promise.all([
      this.spotWs.connect(this.symbols),
      this.futuresWs.connect(this.symbols)
    ]);

    // Iniciar auto-save
    this.supabase.startAutoSave(SAVE_INTERVAL_MS);

    // Iniciar processamento periódico
    this.startProcessing();

    console.log('\n✅ Monitor iniciado! Pressione Ctrl+C para parar.\n');
  }

  private async fetchSymbols() {
    console.log('📋 Buscando lista de pares...');

    try {
      // Buscar pares de futuros (são menos, então usamos como base)
      const response = await fetch('https://contract.mexc.com/api/v1/contract/detail');
      const data = await response.json();

      if (data.success && data.data) {
        this.symbols = data.data
          .filter((c: any) => c.quoteCoin === 'USDT' && c.state === 0)
          .map((c: any) => c.baseCoin);

        console.log(`✅ ${this.symbols.length} pares encontrados\n`);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar pares:', err);
      // Fallback: alguns pares populares
      this.symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'MATIC'];
    }
  }

  private setupHandlers() {
    // Handler para tickers Spot
    this.spotWs.on('ticker', (ticker) => {
      this.calculator.updateSpotPrice(ticker);
    });

    // Handler para tickers Futures
    this.futuresWs.on('ticker', (ticker) => {
      this.calculator.updateFuturesPrice(ticker);
    });

    // Handler para erros
    this.spotWs.on('error', (err, id) => {
      console.error(`Spot[${id}] Error:`, err.message);
    });

    this.futuresWs.on('error', (err, id) => {
      console.error(`Futures[${id}] Error:`, err.message);
    });
  }

  private startProcessing() {
    // Processar e salvar a cada segundo
    setInterval(() => {
      const { opportunities, crossings } = this.calculator.getAllOpportunities();

      // Filtrar por volume mínimo
      const filtered = opportunities.filter(o => 
        o.spot_volume_24h >= MIN_VOLUME_24H || o.futures_volume_24h >= MIN_VOLUME_24H
      );

      // Enfileirar para salvar
      for (const opp of filtered) {
        this.supabase.queueOpportunity(opp);
      }

      // Salvar cruzamentos
      for (const crossing of crossings) {
        this.supabase.saveCrossing(crossing.symbol, crossing.spread);
      }

      // Log de status
      const stats = this.calculator.getStats();
      const positive = filtered.filter(o => o.spread_net_percent > 0).length;
      
      process.stdout.write(
        `\r📊 Spot: ${stats.spotPairs} | Futures: ${stats.futuresPairs} | ` +
        `Opps: ${filtered.length} (${positive} positivas) | ` +
        `Crossings: ${crossings.length}    `
      );
    }, 1000);
  }

  stop() {
    console.log('\n\n🛑 Parando monitor...');
    this.spotWs.disconnect();
    this.futuresWs.disconnect();
    this.supabase.stopAutoSave();
    console.log('✅ Monitor parado');
    process.exit(0);
  }
}

// Iniciar
const monitor = new MexcArbitrageMonitor();

// Graceful shutdown
process.on('SIGINT', () => monitor.stop());
process.on('SIGTERM', () => monitor.stop());

monitor.start().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
