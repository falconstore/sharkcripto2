import * as protobuf from 'protobufjs';
import * as path from 'path';

// Interface para o ticker decodificado
export interface DecodedSpotTicker {
  channel: string;
  symbol: string;
  sendTime: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
}

let protoRoot: protobuf.Root | null = null;
let PushDataV3ApiWrapper: protobuf.Type | null = null;

// Carregar e compilar o arquivo .proto
export async function initProtobuf(): Promise<void> {
  try {
    const protoPath = path.join(__dirname, '../proto/spot.proto');
    protoRoot = await protobuf.load(protoPath);
    PushDataV3ApiWrapper = protoRoot.lookupType('mexc.spot.PushDataV3ApiWrapper');
    console.log('✅ Protobuf: Schema carregado com sucesso');
  } catch (err) {
    console.error('❌ Protobuf: Erro ao carregar schema:', (err as Error).message);
    throw err;
  }
}

// Decodificar mensagem binária
export function decodeSpotMessage(buffer: Buffer): DecodedSpotTicker | null {
  if (!PushDataV3ApiWrapper) {
    console.error('❌ Protobuf: Schema não inicializado');
    return null;
  }

  try {
    const message = PushDataV3ApiWrapper.decode(buffer) as any;
    
    // Extrair dados do BookTicker
    const bookTicker = message.publicBookTicker;
    if (!bookTicker) {
      return null;
    }

    return {
      channel: message.channel || '',
      symbol: message.symbol || '',
      sendTime: Number(message.sendTime) || Date.now(),
      bidPrice: parseFloat(bookTicker.bidPrice) || 0,
      askPrice: parseFloat(bookTicker.askPrice) || 0,
      bidQuantity: parseFloat(bookTicker.bidQuantity) || 0,
      askQuantity: parseFloat(bookTicker.askQuantity) || 0
    };
  } catch (err) {
    // Erro de decodificação - pode ser mensagem de controle ou formato diferente
    return null;
  }
}

// Verificar se o decoder está pronto
export function isProtobufReady(): boolean {
  return PushDataV3ApiWrapper !== null;
}
