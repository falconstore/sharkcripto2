import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { FuturesTicker } from '../types';

const FUTURES_WS_URL = 'wss://contract.mexc.com/edge';
const MAX_SUBSCRIPTIONS_PER_CONNECTION = 200;
const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_INTERVAL = 5000;

interface FuturesWebSocketEvents {
  ticker: (ticker: FuturesTicker) => void;
  connected: (connectionId: number) => void;
  disconnected: (connectionId: number) => void;
  error: (error: Error, connectionId: number) => void;
}

export class FuturesWebSocket extends EventEmitter {
  private connections: Map<number, WebSocket> = new Map();
  private heartbeatIntervals: Map<number, NodeJS.Timeout> = new Map();
  private symbolsByConnection: Map<number, string[]> = new Map();
  private reconnecting: Set<number> = new Set();

  on<K extends keyof FuturesWebSocketEvents>(event: K, listener: FuturesWebSocketEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof FuturesWebSocketEvents>(event: K, ...args: Parameters<FuturesWebSocketEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  async connect(symbols: string[]): Promise<void> {
    // Dividir símbolos em chunks de 200
    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += MAX_SUBSCRIPTIONS_PER_CONNECTION) {
      chunks.push(symbols.slice(i, i + MAX_SUBSCRIPTIONS_PER_CONNECTION));
    }

    console.log(`📡 Futures: Criando ${chunks.length} conexões para ${symbols.length} pares`);

    for (let i = 0; i < chunks.length; i++) {
      this.symbolsByConnection.set(i, chunks[i]);
      await this.createConnection(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async createConnection(connectionId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(FUTURES_WS_URL);
      
      ws.on('open', () => {
        console.log(`✅ Futures[${connectionId}]: Conectado`);
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
        console.log(`⚠️ Futures[${connectionId}]: Desconectado`);
        this.cleanup(connectionId);
        this.emit('disconnected', connectionId);
        this.scheduleReconnect(connectionId);
      });

      ws.on('error', (err) => {
        console.error(`❌ Futures[${connectionId}]: Erro -`, err.message);
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

    // Inscrever no ticker de cada símbolo
    // Formato Futures V2: sub.ticker@SYMBOL
    for (const symbol of symbols) {
      ws.send(JSON.stringify({
        method: 'sub.ticker',
        param: { symbol: `${symbol}_USDT` }
      }));
    }

    console.log(`📩 Futures[${connectionId}]: Inscrito em ${symbols.length} pares`);
  }

  private handleMessage(data: WebSocket.RawData, connectionId: number) {
    try {
      const message = JSON.parse(data.toString());
      
      // Ignorar PONG
      if (message.channel === 'pong') return;
      
      // Processar ticker
      if (message.channel === 'push.ticker' && message.data) {
        const d = message.data;
        const symbol = message.symbol?.replace('_USDT', '') || '';
        
        const ticker: FuturesTicker = {
          symbol,
          bidPrice: parseFloat(d.bid1) || 0,
          askPrice: parseFloat(d.ask1) || 0,
          volume24h: parseFloat(d.volume24) || 0,
          fundingRate: parseFloat(d.fundingRate) || 0,
          timestamp: Date.now()
        };
        
        this.emit('ticker', ticker);
      }
    } catch (err) {
      // Ignorar erros de parse
    }
  }

  private startHeartbeat(connectionId: number) {
    const interval = setInterval(() => {
      const ws = this.connections.get(connectionId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: 'ping' }));
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
    console.log(`🔄 Futures[${connectionId}]: Reconectando em ${RECONNECT_INTERVAL / 1000}s...`);
    
    setTimeout(async () => {
      this.reconnecting.delete(connectionId);
      try {
        await this.createConnection(connectionId);
      } catch (err) {
        console.error(`❌ Futures[${connectionId}]: Falha na reconexão`);
        this.scheduleReconnect(connectionId);
      }
    }, RECONNECT_INTERVAL);
  }

  disconnect() {
    for (const [id, ws] of this.connections) {
      ws.close();
      this.cleanup(id);
    }
    console.log('🔌 Futures: Todas conexões fechadas');
  }
}
