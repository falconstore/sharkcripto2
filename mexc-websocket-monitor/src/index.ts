import 'dotenv/config';
import { SpotWebSocket } from './websocket/SpotWebSocket';
import { FuturesWebSocket } from './websocket/FuturesWebSocket';
import { SpreadCalculator } from './services/SpreadCalculator';
import { SupabaseService } from './services/SupabaseService';
import { VolumeService } from './services/VolumeService';

const MIN_VOLUME_24H = parseFloat(process.env.MIN_VOLUME_24H || '100000');
const SAVE_INTERVAL_MS = parseInt(process.env.SAVE_INTERVAL_MS || '1000');
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Pares problemáticos a ignorar (ações tokenizadas, stablecoins, alavancados, etc.)
const BLOCKED_SUFFIXES = [
  'STOCK', 'STOCKUSDT',           // Ações tokenizadas
  'CHF', 'TRY', 'EUR', 'GBP', 'JPY', // Moedas fiat
  '3L', '3S', '5L', '5S',         // Tokens alavancados
  'UP', 'DOWN', 'BULL', 'BEAR'    // Mais tokens alavancados
];
const BLOCKED_SYMBOLS = new Set([
  'USDC', 'BUSD', 'TUSD', 'USDP', 'DAI', 'FDUSD', 'USDD', // Stablecoins
  'WBTC', 'WETH', 'STETH',        // Wrapped tokens
  'KEFUXIAOHE', 'HAJIMI',         // Símbolos específicos bloqueados pela MEXC
]);

class MexcArbitrageMonitor {
  private spotWs: SpotWebSocket;
  private futuresWs: FuturesWebSocket;
  private calculator: SpreadCalculator;
  private supabase: SupabaseService;
  private volumeService: VolumeService;
  private symbols: string[] = [];
  private spotSymbols: Set<string> = new Set();

  constructor() {
    this.spotWs = new SpotWebSocket();
    this.futuresWs = new FuturesWebSocket();
    this.calculator = new SpreadCalculator();
    this.supabase = new SupabaseService();
    this.volumeService = new VolumeService();
  }

  async start() {
    console.log('🚀 Iniciando MEXC Arbitrage Monitor...\n');
    console.log(`📋 Configuração:`);
    console.log(`   - Volume mínimo: ${MIN_VOLUME_24H.toLocaleString()} USDT`);
    console.log(`   - Intervalo de save: ${SAVE_INTERVAL_MS}ms`);
    console.log(`   - Debug mode: ${DEBUG_MODE}\n`);

    // Buscar volumes primeiro (para filtrar por volume)
    await this.volumeService.fetchVolumes();
    
    // Buscar lista de pares spot disponíveis
    await this.fetchSpotSymbols();

    // Buscar lista de pares futuros
    await this.fetchFuturesSymbols();

    // Filtrar apenas símbolos que existem em ambos os mercados
    this.filterCommonSymbols();

    // Carregar blacklist
    const blacklist = await this.supabase.getBlacklist();
    this.calculator.setBlacklist(blacklist);
    console.log(`🚫 Blacklist: ${blacklist.length} pares\n`);

    // Passar cache de volume para o WebSocket
    this.spotWs.setVolumeCache(this.volumeService['volumeCache']);

    // Configurar handlers
    this.setupHandlers();

    // Conectar WebSockets
    await Promise.all([
      this.spotWs.connect(this.symbols),
      this.futuresWs.connect(this.symbols)
    ]);

    // Iniciar auto-save e auto-update de volumes
    this.supabase.startAutoSave(SAVE_INTERVAL_MS);
    this.volumeService.startAutoUpdate();

    // Iniciar processamento periódico
    this.startProcessing();

    console.log('\n✅ Monitor iniciado! Pressione Ctrl+C para parar.\n');
  }

  private async fetchSpotSymbols() {
    console.log('📋 Buscando pares Spot disponíveis...');
    
    try {
      const response = await fetch('https://api.mexc.com/api/v3/exchangeInfo');
      const data: any = await response.json();
      
      if (data.symbols) {
        for (const s of data.symbols) {
          // Critérios RIGOROSOS conforme documentação MEXC
          const hasSpotPermission = s.permissions && s.permissions.includes('SPOT');
          const isSpotAllowed = s.isSpotTradingAllowed === true;
          const isEnabled = s.status === 'ENABLED';
          const isUSDT = s.quoteAsset === 'USDT';
          
          if (isEnabled && isUSDT && hasSpotPermission && isSpotAllowed) {
            const symbol = s.baseAsset;
            
            // Filtrar símbolos problemáticos
            if (this.isBlockedSymbol(symbol)) continue;
            
            this.spotSymbols.add(symbol);
          }
        }
        console.log(`✅ ${this.spotSymbols.size} pares Spot permitidos para WebSocket`);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar pares Spot:', (err as Error).message);
    }
  }

  private async fetchFuturesSymbols() {
    console.log('📋 Buscando pares Futures disponíveis...');

    try {
      const response = await fetch('https://contract.mexc.com/api/v1/contract/detail');
      const data: any = await response.json();

      if (data.success && data.data) {
        const futuresSymbols = data.data
          .filter((c: any) => c.quoteCoin === 'USDT' && c.state === 0)
          .map((c: any) => c.baseCoin)
          .filter((s: string) => !this.isBlockedSymbol(s));

        console.log(`✅ ${futuresSymbols.length} pares Futures disponíveis`);
        
        // Armazenar temporariamente
        this.symbols = futuresSymbols;
      }
    } catch (err) {
      console.error('❌ Erro ao buscar pares Futures:', (err as Error).message);
      // Fallback
      this.symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'MATIC'];
    }
  }

  private isBlockedSymbol(symbol: string): boolean {
    // Verificar se é um símbolo bloqueado
    if (BLOCKED_SYMBOLS.has(symbol)) return true;
    
    // Verificar sufixos bloqueados
    for (const suffix of BLOCKED_SUFFIXES) {
      if (symbol.includes(suffix)) return true;
    }
    
    return false;
  }

  private filterCommonSymbols() {
    const before = this.symbols.length;
    const notInSpot: string[] = [];
    
    // Filtrar apenas símbolos que existem em ambos os mercados
    this.symbols = this.symbols.filter(symbol => {
      const inSpot = this.spotSymbols.has(symbol);
      
      if (!inSpot) {
        notInSpot.push(symbol);
      }
      
      return inSpot;
    });
    
    console.log(`\n📊 Símbolos filtrados: ${before} -> ${this.symbols.length} (existem em ambos os mercados)`);
    
    // Log de símbolos rejeitados (para debug)
    if (DEBUG_MODE && notInSpot.length > 0) {
      console.log(`⚠️ ${notInSpot.length} símbolos de Futures não encontrados/permitidos no Spot:`);
      console.log(`   ${notInSpot.slice(0, 20).join(', ')}${notInSpot.length > 20 ? '...' : ''}`);
    }
    
    // Log de alguns símbolos válidos
    if (this.symbols.length > 0) {
      console.log(`✅ Primeiros 10 símbolos válidos: ${this.symbols.slice(0, 10).join(', ')}\n`);
    }
  }

  private setupHandlers() {
    // Handler para tickers Spot
    this.spotWs.on('ticker', (ticker) => {
      // Adicionar volume do cache se não tiver
      if (ticker.volume24h === 0) {
        ticker.volume24h = this.volumeService.getVolume(ticker.symbol);
      }
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

      // Filtrar por volume mínimo (aceitar se qualquer um tiver volume)
      const filtered = opportunities.filter(o => 
        o.spot_volume_24h >= MIN_VOLUME_24H || o.futures_volume_24h >= MIN_VOLUME_24H
      );

      // Se não temos oportunidades com volume, aceitar todas (pode ser problema de volume)
      const toSave = filtered.length > 0 ? filtered : opportunities.slice(0, 50);

      // Enfileirar para salvar
      for (const opp of toSave) {
        this.supabase.queueOpportunity(opp);
      }

      // Salvar cruzamentos
      for (const crossing of crossings) {
        this.supabase.saveCrossing(crossing.symbol, crossing.spread);
      }

      // Log de status
      const stats = this.calculator.getStats();
      const spotStats = this.spotWs.getStats();
      const volumeStats = this.volumeService.getStats();
      const positive = opportunities.filter(o => o.spread_net_percent > 0).length;
      
      process.stdout.write(
        `\r📊 Spot: ${stats.spotPairs} | Futures: ${stats.futuresPairs} | ` +
        `Opps: ${opportunities.length} (${positive} +) | ` +
        `Save: ${toSave.length} | ` +
        `Cross: ${crossings.length} | ` +
        `Vol: ${volumeStats.cachedSymbols}    `
      );
    }, 1000);
  }

  stop() {
    console.log('\n\n🛑 Parando monitor...');
    this.spotWs.disconnect();
    this.futuresWs.disconnect();
    this.supabase.stopAutoSave();
    this.volumeService.stopAutoUpdate();
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
