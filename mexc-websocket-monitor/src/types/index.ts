export interface SpotTicker {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  timestamp: number;
}

export interface FuturesTicker {
  symbol: string;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  fundingRate: number;
  timestamp: number;
}

export interface PriceCache {
  spot: Map<string, SpotTicker>;
  futures: Map<string, FuturesTicker>;
}

export interface Opportunity {
  pair_symbol: string;
  spot_bid_price: number;
  spot_volume_24h: number;
  futures_ask_price: number;
  futures_volume_24h: number;
  spread_gross_percent: number;
  spread_net_percent: number;
  spread_net_percent_entrada: number;
  spread_net_percent_saida: number;
  spot_taker_fee: number;
  futures_taker_fee: number;
  funding_rate: number;
  timestamp: string;
  is_active: boolean;
}

export interface WebSocketConfig {
  url: string;
  name: string;
  maxSubscriptions: number;
  heartbeatInterval: number;
  reconnectInterval: number;
}

export interface SubscriptionMessage {
  method: string;
  params?: string[];
}
