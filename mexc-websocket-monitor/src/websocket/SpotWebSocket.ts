import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { SpotTicker } from '../types';
import { initProtobuf, decodeSpotMessage, isProtobufReady } from '../services/ProtobufDecoder';

// Configuração - usar JSON por padrão (mais confiável)
const USE_JSON_FORMAT = process.env.SPOT_USE_JSON !== 'false';
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
  private protobufInitialized = false;
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
    // Inicializar Protobuf se não usar JSON
    if (!USE_JSON_FORMAT && !this.protobufInitialized) {
      try {
        await initProtobuf();
        this.protobufInitialized = true;
      } catch (err) {
        console.error('❌ Spot: Falha ao inicializar Protobuf, usando JSON');
      }
    }

    console.log(`📡 Spot: Usando formato ${USE_JSON_FORMAT ? 'JSON' : 'Protobuf'}`);

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

    let params: string[];
    
    if (USE_JSON_FORMAT) {
      // Formato JSON: spot@public.bookTicker.v3.api@BTCUSDT
      params = symbols.map(s => `spot@public.bookTicker.v3.api@${s.toUpperCase()}USDT`);
    } else {
      // Formato Protobuf: spot@public.aggre.bookTicker.v3.api.pb@100ms@BTCUSDT
      params = symbols.map(s => `spot@public.aggre.bookTicker.v3.api.pb@100ms@${s.toUpperCase()}USDT`);
    }
    
    const subscribeMsg = {
      method: 'SUBSCRIPTION',
      params
    };
    
    console.log(`📩 Spot[${connectionId}]: Enviando subscription para ${symbols.length} pares...`);
    if (DEBUG_MODE) {
      console.log(`📩 Spot[${connectionId}]: Exemplo de channel: ${params[0]}`);
    }
    
    ws.send(JSON.stringify(subscribeMsg));
  }

  private handleMessage(data: WebSocket.RawData, connectionId: number) {
    try {
      // Converter para string se possível
      const str = Buffer.isBuffer(data) ? data.toString() : 
                  typeof data === 'string' ? data : null;
      
      // Tentar processar como JSON primeiro
      if (str && str.startsWith('{')) {
        this.processJsonMessage(str, connectionId);
        return;
      }

      // Se não for JSON e estivermos usando Protobuf
      if (!USE_JSON_FORMAT && Buffer.isBuffer(data) && isProtobufReady()) {
        const decoded = decodeSpotMessage(data);
        if (decoded && decoded.bidPrice > 0) {
          const symbol = decoded.symbol.replace('USDT', '');
          const volume = this.volumeCache.get(symbol) || 0;
          
          const ticker: SpotTicker = {
            symbol,
            bidPrice: decoded.bidPrice,
            askPrice: decoded.askPrice > 0 ? decoded.askPrice : decoded.bidPrice,
            volume24h: volume,
            timestamp: decoded.sendTime
          };
          
          this.emit('ticker', ticker);
          this.tickerCount++;
          
          if (!this.firstMessageLogged) {
            console.log(`📦 Spot: Primeiro ticker Protobuf: ${symbol} bid=${decoded.bidPrice} ask=${decoded.askPrice} vol=${volume}`);
            this.firstMessageLogged = true;
          }
          
          if (this.tickerCount % 1000 === 0) {
            console.log(`📊 Spot: ${this.tickerCount} tickers processados`);
          }
        }
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

      // Formato JSON do bookTicker
      // Formato: {"c":"spot@public.bookTicker.v3.api@BTCUSDT","d":{"A":"95123.85","B":"95123.84","a":"0.00042","b":"0.12341"},"s":"BTCUSDT","t":1234567890}
      if (message.d && message.s) {
        const d = message.d;
        const symbol = message.s.replace('USDT', '');
        const volume = this.volumeCache.get(symbol) || 0;
        
        // A = ask price, B = bid price, a = ask qty, b = bid qty
        const askPrice = parseFloat(d.A) || parseFloat(d.a) || 0;
        const bidPrice = parseFloat(d.B) || parseFloat(d.b) || 0;
        
        if (bidPrice > 0) {
          const ticker: SpotTicker = {
            symbol,
            bidPrice,
            askPrice: askPrice > 0 ? askPrice : bidPrice,
            volume24h: volume,
            timestamp: message.t || Date.now()
          };
          
          this.emit('ticker', ticker);
          this.tickerCount++;
          
          if (!this.firstMessageLogged) {
            console.log(`📦 Spot: Primeiro ticker JSON: ${symbol} bid=${bidPrice} ask=${askPrice} vol=${volume}`);
            this.firstMessageLogged = true;
          }
          
          if (this.tickerCount % 1000 === 0) {
            console.log(`📊 Spot: ${this.tickerCount} tickers processados`);
          }
        }
        return;
      }

      // Formato alternativo (antigo)
      if (message.publicbookticker && message.symbol) {
        const bt = message.publicbookticker;
        const symbol = message.symbol.replace('USDT', '');
        const volume = this.volumeCache.get(symbol) || 0;
        
        const ticker: SpotTicker = {
          symbol,
          bidPrice: parseFloat(bt.bidprice || bt.bidPrice) || 0,
          askPrice: parseFloat(bt.askprice || bt.askPrice) || 0,
          volume24h: volume,
          timestamp: message.sendtime || message.sendTime || Date.now()
        };
        
        if (ticker.bidPrice > 0) {
          this.emit('ticker', ticker);
          this.tickerCount++;
        }
      }
    } catch (err) {
      // Ignorar erros de parse JSON
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
      format: USE_JSON_FORMAT ? 'JSON' : 'Protobuf'
    };
  }
}
