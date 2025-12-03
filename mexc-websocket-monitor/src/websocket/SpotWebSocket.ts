import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { SpotTicker } from '../types';

const SPOT_WS_URL = 'wss://wbs-api.mexc.com/ws';
const MAX_SUBSCRIPTIONS_PER_CONNECTION = 30;
const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_INTERVAL = 5000;
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

interface SpotWebSocketEvents {
  ticker: (ticker: SpotTicker) => void;
  connected: (connectionId: number) => void;
  disconnected: (connectionId: number) => void;
  error: (error: Error, connectionId: number) => void;
}

export class SpotWebSocket extends EventEmitter {
  private connections: Map<number, WebSocket> = new Map();
  private heartbeatIntervals: Map<number, NodeJS.Timeout> = new Map();
  private symbolsByConnection: Map<number, string[]> = new Map();
  private reconnecting: Set<number> = new Set();
  private firstMessageLogged = false;
  private tickerCount = 0;
  private volumeCache: Map<string, number> = new Map();

  on<K extends keyof SpotWebSocketEvents>(event: K, listener: SpotWebSocketEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof SpotWebSocketEvents>(event: K, ...args: Parameters<SpotWebSocketEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  setVolumeCache(cache: Map<string, number>) {
    this.volumeCache = cache;
  }

  async connect(symbols: string[]): Promise<void> {
    console.log(`📡 Spot: Conectando com formato JSON (campos lowercase)`);

    // Dividir símbolos em chunks de 30
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += MAX_SUBSCRIPTIONS_PER_CONNECTION) {
      chunks.push(symbols.slice(i, i + MAX_SUBSCRIPTIONS_PER_CONNECTION));
    }

    console.log(`📡 Spot: Criando ${chunks.length} conexões para ${symbols.length} pares`);

    for (let i = 0; i < chunks.length; i++) {
      this.symbolsByConnection.set(i, chunks[i]);
      await this.createConnection(i);
      // Pequeno delay entre conexões para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async createConnection(connectionId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(SPOT_WS_URL);
      
      ws.on('open', () => {
        console.log(`✅ Spot[${connectionId}]: Conectado`);
        this.connections.set(connectionId, ws);
        this.startHeartbeat(connectionId);
        this.subscribe(connectionId);
        this.emit('connected', connectionId);
        resolve();
      });

      ws.on('message', (data: WebSocket.RawData) => {
        this.handleMessage(data, connectionId);
      });

      ws.on('close', () => {
        console.log(`⚠️ Spot[${connectionId}]: Desconectado`);
        this.cleanup(connectionId);
        this.emit('disconnected', connectionId);
        this.scheduleReconnect(connectionId);
      });

      ws.on('error', (err) => {
        console.error(`❌ Spot[${connectionId}]: Erro -`, err.message);
        this.emit('error', err, connectionId);
        if (!this.connections.has(connectionId)) {
          reject(err);
        }
      });
    });
  }

  private subscribe(connectionId: number) {
    const ws = this.connections.get(connectionId);
    const symbols = this.symbolsByConnection.get(connectionId);
    
    if (!ws || !symbols) return;

    // Usar o canal agregado que retorna JSON com campos lowercase
    // Formato: spot@public.aggre.bookTicker.v3.api.pb@100ms@BTCUSDT
    // Resposta JSON: { publicbookticker: { bidprice, askprice, ... }, symbol, sendtime }
    const params = symbols.map(s => `spot@public.aggre.bookTicker.v3.api.pb@100ms@${s.toUpperCase()}USDT`);
    
    const subscribeMsg = {
      method: 'SUBSCRIPTION',
      params
    };
    
    console.log(`📩 Spot[${connectionId}]: Enviando subscription para ${symbols.length} pares...`);
    console.log(`📩 Spot[${connectionId}]: Exemplo de channel: ${params[0]}`);
    
    ws.send(JSON.stringify(subscribeMsg));
  }

  private handleMessage(data: WebSocket.RawData, connectionId: number) {
    try {
      // Converter para string
      const str = Buffer.isBuffer(data) ? data.toString('utf8') : 
                  typeof data === 'string' ? data : null;
      
      if (!str) return;
      
      // Tentar processar como JSON
      if (str.startsWith('{')) {
        this.processJsonMessage(str, connectionId);
      }
    } catch (err) {
      if (DEBUG_MODE || this.tickerCount < 10) {
        console.error(`❌ Spot[${connectionId}]: Erro ao processar mensagem:`, (err as Error).message);
      }
    }
  }

  private processJsonMessage(str: string, connectionId: number) {
    try {
      const message = JSON.parse(str);
      
      // Ignorar PONG
      if (message.msg === 'PONG') return;
      
      // Log de confirmação de subscription
      if (message.id !== undefined && message.code !== undefined) {
        if (message.code === 0) {
          console.log(`✅ Spot[${connectionId}]: Subscription confirmada - ${message.msg}`);
        } else {
          console.log(`❌ Spot[${connectionId}]: Subscription falhou (code: ${message.code}) - ${message.msg}`);
        }
        return;
      }

      // Formato OFICIAL MEXC (documentação):
      // {
      //   "channel": "spot@public.aggre.bookTicker.v3.api.pb@100ms@BTCUSDT",
      //   "publicbookticker": {
      //     "bidprice": "93387.28",
      //     "bidquantity": "3.73485",
      //     "askprice": "93387.29",
      //     "askquantity": "7.669875"
      //   },
      //   "symbol": "BTCUSDT",
      //   "sendtime": 1736412092433
      // }
      if (message.publicbookticker && message.symbol) {
        const bt = message.publicbookticker;
        const symbol = message.symbol.replace('USDT', '');
        const volume = this.volumeCache.get(symbol) || 0;
        
        // Campos são LOWERCASE conforme documentação MEXC
        const bidPrice = parseFloat(bt.bidprice) || 0;
        const askPrice = parseFloat(bt.askprice) || 0;
        
        if (bidPrice > 0 && askPrice > 0) {
          const ticker: SpotTicker = {
            symbol,
            bidPrice,
            askPrice,
            volume24h: volume,
            timestamp: message.sendtime || Date.now()
          };
          
          this.emit('ticker', ticker);
          this.tickerCount++;
          
          if (!this.firstMessageLogged) {
            console.log(`📦 Spot: Primeiro ticker: ${symbol} bid=${bidPrice} ask=${askPrice} vol=${volume}`);
            this.firstMessageLogged = true;
          }
          
          if (DEBUG_MODE && this.tickerCount <= 3) {
            console.log(`🔍 Debug ticker: ${JSON.stringify(message).substring(0, 200)}`);
          }
        } else if (!this.firstMessageLogged) {
          // Debug: mostrar mensagem que falhou
          console.log(`⚠️ Spot: Ticker inválido - bid=${bidPrice} ask=${askPrice}`);
          console.log(`   Raw: ${JSON.stringify(bt)}`);
          this.firstMessageLogged = true;
        }
        return;
      }

      // Formato alternativo batch
      if (message.publicBookTickerBatch && message.symbol) {
        const items = message.publicBookTickerBatch.items || [];
        if (items.length > 0) {
          const item = items[0];
          const symbol = message.symbol.replace('USDT', '');
          const volume = this.volumeCache.get(symbol) || 0;
          
          const bidPrice = parseFloat(item.bidPrice || item.bidprice) || 0;
          const askPrice = parseFloat(item.askPrice || item.askprice) || 0;
          
          if (bidPrice > 0 && askPrice > 0) {
            const ticker: SpotTicker = {
              symbol,
              bidPrice,
              askPrice,
              volume24h: volume,
              timestamp: parseInt(message.sendTime) || Date.now()
            };
            
            this.emit('ticker', ticker);
            this.tickerCount++;
          }
        }
        return;
      }

      // Debug: mostrar formato de mensagem desconhecida
      if (DEBUG_MODE && !this.firstMessageLogged && message.channel) {
        console.log(`🔍 Formato desconhecido: ${JSON.stringify(message).substring(0, 300)}`);
      }
    } catch (err) {
      if (DEBUG_MODE) {
        console.error('❌ JSON parse error:', (err as Error).message);
      }
    }
  }

  private startHeartbeat(connectionId: number) {
    const interval = setInterval(() => {
      const ws = this.connections.get(connectionId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: 'PING' }));
      }
    }, HEARTBEAT_INTERVAL);
    
    this.heartbeatIntervals.set(connectionId, interval);
  }

  private cleanup(connectionId: number) {
    const interval = this.heartbeatIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionId);
    }
    this.connections.delete(connectionId);
  }

  private scheduleReconnect(connectionId: number) {
    if (this.reconnecting.has(connectionId)) return;
    
    this.reconnecting.add(connectionId);
    console.log(`🔄 Spot[${connectionId}]: Reconectando em ${RECONNECT_INTERVAL / 1000}s...`);
    
    setTimeout(async () => {
      this.reconnecting.delete(connectionId);
      try {
        await this.createConnection(connectionId);
      } catch (err) {
        console.error(`❌ Spot[${connectionId}]: Falha na reconexão`);
        this.scheduleReconnect(connectionId);
      }
    }, RECONNECT_INTERVAL);
  }

  disconnect() {
    for (const [id, ws] of this.connections) {
      ws.close();
      this.cleanup(id);
    }
    console.log('🔌 Spot: Todas conexões fechadas');
  }

  getStats() {
    return {
      connections: this.connections.size,
      tickerCount: this.tickerCount,
      format: 'JSON'
    };
  }
}
