import { SpotTicker, FuturesTicker, Opportunity, PriceCache } from '../types';

// Taxas da MEXC (em %)
const SPOT_TAKER_FEE = 0.10;
const FUTURES_TAKER_FEE = 0.02;

export class SpreadCalculator {
  private priceCache: PriceCache = {
    spot: new Map(),
    futures: new Map()
  };
  
  private previousSpreads: Map<string, number> = new Map();
  private blacklist: Set<string> = new Set();

  updateSpotPrice(ticker: SpotTicker) {
    this.priceCache.spot.set(ticker.symbol, ticker);
  }

  updateFuturesPrice(ticker: FuturesTicker) {
    this.priceCache.futures.set(ticker.symbol, ticker);
  }

  setBlacklist(symbols: string[]) {
    this.blacklist = new Set(symbols);
  }

  calculateOpportunity(symbol: string): { opportunity: Opportunity | null; crossed: boolean } {
    const spotTicker = this.priceCache.spot.get(symbol);
    const futuresTicker = this.priceCache.futures.get(symbol);

    if (!spotTicker || !futuresTicker) {
      return { opportunity: null, crossed: false };
    }

    // Verificar blacklist
    if (this.blacklist.has(symbol)) {
      return { opportunity: null, crossed: false };
    }

    const spotBid = spotTicker.bidPrice;
    const spotAsk = spotTicker.askPrice;
    const futuresBid = futuresTicker.bidPrice;
    const futuresAsk = futuresTicker.askPrice;

    if (spotBid <= 0 || futuresAsk <= 0) {
      return { opportunity: null, crossed: false };
    }

    // Spread Bruto: (Futuros - Spot) / Spot * 100
    const spreadGross = ((futuresAsk - spotBid) / spotBid) * 100;

    // Spread Líquido LONG (Entrada): Comprar Spot + Vender Futures
    // Custo: compra spot (ask) + venda futures (bid)
    const spreadNetLong = ((futuresBid - spotAsk) / spotAsk) * 100 - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

    // Spread Líquido SHORT (Saída): Vender Spot + Comprar Futures
    // Custo: venda spot (bid) + compra futures (ask)
    const spreadNetShort = ((spotBid - futuresAsk) / futuresAsk) * 100 - SPOT_TAKER_FEE - FUTURES_TAKER_FEE;

    // Spread líquido geral (maior dos dois)
    const spreadNet = Math.max(spreadNetLong, spreadNetShort);

    // Detectar cruzamento (de negativo para positivo no spread de saída)
    const previousSpread = this.previousSpreads.get(symbol) ?? spreadNetShort;
    const crossed = previousSpread < 0 && spreadNetShort >= 0;
    this.previousSpreads.set(symbol, spreadNetShort);

    const opportunity: Opportunity = {
      pair_symbol: symbol,
      spot_bid_price: spotBid,
      spot_volume_24h: spotTicker.volume24h,
      futures_ask_price: futuresAsk,
      futures_volume_24h: futuresTicker.volume24h,
      spread_gross_percent: spreadGross,
      spread_net_percent: spreadNet,
      spread_net_percent_entrada: spreadNetLong,
      spread_net_percent_saida: spreadNetShort,
      spot_taker_fee: SPOT_TAKER_FEE,
      futures_taker_fee: FUTURES_TAKER_FEE,
      funding_rate: futuresTicker.fundingRate,
      timestamp: new Date().toISOString(),
      is_active: true
    };

    return { opportunity, crossed };
  }

  getAllOpportunities(): { opportunities: Opportunity[]; crossings: Array<{ symbol: string; spread: number }> } {
    const opportunities: Opportunity[] = [];
    const crossings: Array<{ symbol: string; spread: number }> = [];

    // Usar símbolos de futuros como referência
    for (const symbol of this.priceCache.futures.keys()) {
      const { opportunity, crossed } = this.calculateOpportunity(symbol);
      
      if (opportunity) {
        opportunities.push(opportunity);
        
        if (crossed) {
          crossings.push({ symbol, spread: opportunity.spread_net_percent_saida });
        }
      }
    }

    return { opportunities, crossings };
  }

  getStats() {
    return {
      spotPairs: this.priceCache.spot.size,
      futuresPairs: this.priceCache.futures.size,
      blacklisted: this.blacklist.size
    };
  }
}
