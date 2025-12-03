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
let debugCount = 0;
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

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
    
    // DEBUG: Ver estrutura real das primeiras mensagens
    if (DEBUG_MODE && debugCount < 5) {
      console.log(`\n🔍 DEBUG Protobuf Raw Message #${debugCount + 1}:`);
      console.log(JSON.stringify(message, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      debugCount++;
    }
    
    // Extrair dados do BookTicker - tentar diferentes nomes de campo
    const bookTicker = message.publicBookTicker || 
                       message.public_book_ticker || 
                       message.publicbookticker ||
                       message.bookTicker;
                       
    if (!bookTicker) {
      // Log apenas nas primeiras tentativas
      if (DEBUG_MODE && debugCount < 10) {
        console.log(`⚠️ Protobuf: Mensagem sem bookTicker, keys disponíveis:`, Object.keys(message));
      }
      return null;
    }

    // Tentar diferentes formatos de campo (camelCase e snake_case)
    const bidPrice = parseFloat(
      bookTicker.bidPrice || 
      bookTicker.bid_price || 
      bookTicker.bidprice || 
      '0'
    );
    
    const askPrice = parseFloat(
      bookTicker.askPrice || 
      bookTicker.ask_price || 
      bookTicker.askprice || 
      '0'
    );
    
    const bidQuantity = parseFloat(
      bookTicker.bidQuantity || 
      bookTicker.bid_quantity || 
      bookTicker.bidquantity || 
      '0'
    );
    
    const askQuantity = parseFloat(
      bookTicker.askQuantity || 
      bookTicker.ask_quantity || 
      bookTicker.askquantity || 
      '0'
    );

    // DEBUG: Ver valores extraídos
    if (DEBUG_MODE && debugCount <= 5 && bidPrice > 0) {
      console.log(`📊 Protobuf Parsed: bid=${bidPrice} ask=${askPrice} bidQty=${bidQuantity} askQty=${askQuantity}`);
      console.log(`   BookTicker keys:`, Object.keys(bookTicker));
    }

    return {
      channel: message.channel || '',
      symbol: message.symbol || '',
      sendTime: Number(message.sendTime || message.send_time) || Date.now(),
      bidPrice,
      askPrice,
      bidQuantity,
      askQuantity
    };
  } catch (err) {
    // Erro de decodificação - pode ser mensagem de controle ou formato diferente
    if (DEBUG_MODE) {
      console.error('❌ Protobuf decode error:', (err as Error).message);
    }
    return null;
  }
}

// Verificar se o decoder está pronto
export function isProtobufReady(): boolean {
  return PushDataV3ApiWrapper !== null;
}
