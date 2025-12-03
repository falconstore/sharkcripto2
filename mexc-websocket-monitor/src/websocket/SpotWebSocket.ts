import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { SpotTicker } from '../types';

const SPOT_WS_URL = 'wss://wbs.mexc.com/ws';
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

  on<K extends keyof SpotWebSocketEvents>(event: K, listener: SpotWebSocketEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof SpotWebSocketEvents>(event: K, ...args: Parameters<SpotWebSocketEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  async connect(symbols: string[]): Promise<void> {
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

    // Inscrever no ticker de cada símbolo
    const params = symbols.map(s => `spot@public.bookTicker.v3.api@${s}`);
    
    ws.send(JSON.stringify({
      method: 'SUBSCRIPTION',
      params
    }));

    console.log(`📩 Spot[${connectionId}]: Inscrito em ${symbols.length} pares`);
  }

  private handleMessage(data: WebSocket.RawData, connectionId: number) {
    try {
      const message = JSON.parse(data.toString());
      
      // Ignorar PONG
      if (message.msg === 'PONG') return;
      
      // Ignorar mensagens de confirmação
      if (message.id !== undefined) return;

      // Processar ticker
      if (message.d && message.s) {
        const ticker: SpotTicker = {
          symbol: message.s,
          bidPrice: parseFloat(message.d.b) || 0,
          askPrice: parseFloat(message.d.a) || 0,
          volume24h: parseFloat(message.d.v) || 0,
          timestamp: Date.now()
        };
        
        this.emit('ticker', ticker);
      }
    } catch (err) {
      // Pode ser mensagem binária (Protobuf) - ignorar por enquanto
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
