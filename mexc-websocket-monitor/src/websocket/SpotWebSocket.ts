import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { SpotTicker } from '../types';
import { initProtobuf, decodeSpotMessage, isProtobufReady } from '../services/ProtobufDecoder';

const SPOT_WS_URL = 'wss://wbs-api.mexc.com/ws';
const MAX_SUBSCRIPTIONS_PER_CONNECTION = 30;
const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_INTERVAL = 5000;

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

  on<K extends keyof SpotWebSocketEvents>(event: K, listener: SpotWebSocketEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof SpotWebSocketEvents>(event: K, ...args: Parameters<SpotWebSocketEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  async connect(symbols: string[]): Promise<void> {
    // Inicializar Protobuf antes de conectar
    if (!this.protobufInitialized) {
      try {
        await initProtobuf();
        this.protobufInitialized = true;
      } catch (err) {
        console.error('❌ Spot: Falha ao inicializar Protobuf, continuando sem decodificação');
      }
    }

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

    // Formato da documentação: spot@public.aggre.bookTicker.v3.api.pb@100ms@SYMBOL
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
      // Verificar se é dado binário (Protobuf)
      if (Buffer.isBuffer(data)) {
        // Tentar como string JSON primeiro (mensagens de controle)
        const str = data.toString();
        if (str.startsWith('{')) {
          this.processJsonMessage(str, connectionId);
          return;
        }

        // Decodificar Protobuf
        if (isProtobufReady()) {
          const decoded = decodeSpotMessage(data);
          if (decoded && decoded.bidPrice > 0) {
            // Remover sufixo USDT do symbol para consistência
            const symbol = decoded.symbol.replace('USDT', '');
            
            const ticker: SpotTicker = {
              symbol,
              bidPrice: decoded.bidPrice,
              askPrice: decoded.askPrice,
              volume24h: 0,
              timestamp: decoded.sendTime
            };
            
            this.emit('ticker', ticker);
            this.tickerCount++;
            
            // Log do primeiro ticker decodificado
            if (!this.firstMessageLogged) {
              console.log(`📦 Spot: Primeiro ticker Protobuf decodificado: ${symbol} bid=${decoded.bidPrice} ask=${decoded.askPrice}`);
              this.firstMessageLogged = true;
            }
            
            // Log periódico
            if (this.tickerCount % 1000 === 0) {
              console.log(`📊 Spot: ${this.tickerCount} tickers processados`);
            }
          }
        }
        return;
      }
      
      // Mensagem de texto
      if (typeof data === 'string' || data instanceof Buffer) {
        this.processJsonMessage(data.toString(), connectionId);
      }
    } catch (err) {
      // Log de erro apenas para debug
      if (this.tickerCount < 10) {
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

      // Formato JSON alternativo (fallback)
      if (message.publicbookticker && message.symbol) {
        const bt = message.publicbookticker;
        const symbol = message.symbol.replace('USDT', '');
        const ticker: SpotTicker = {
          symbol,
          bidPrice: parseFloat(bt.bidprice) || 0,
          askPrice: parseFloat(bt.askprice) || 0,
          volume24h: 0,
          timestamp: message.sendtime || Date.now()
        };
        
        this.emit('ticker', ticker);
      }
    } catch (err) {
      // Ignorar erros de parse JSON
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
}
