/**
 * Gera URLs para as exchanges
 * @param symbol - Símbolo da moeda (ex: BTC)
 * @param exchange - Nome da exchange (ex: binance)
 * @param market - Mercado (SPOT ou FUTURES)
 * @returns URL da moeda na exchange ou null se não suportado
 */
export function getExchangeUrl(
  symbol: string, 
  exchange: string, 
  market: 'SPOT' | 'FUTURES'
): string | null {
  const normalizedSymbol = symbol.replace('/', '').replace('-', '') + '_USDT';
  const simpleSymbol = symbol.replace('/', '').replace('-', '');
  const lowerExchange = exchange.toLowerCase();
  const marketType = market.toLowerCase() as 'spot' | 'future';

  const exchangeUrls: Record<string, { spot: string; future: string }> = {
    binance: {
      spot: `https://www.binance.com/pt-BR/trade/${normalizedSymbol}?type=spot`,
      future: `https://www.binance.com/pt-BR/futures/${normalizedSymbol}`
    },
    mexc: {
      spot: `https://www.mexc.com/pt-PT/exchange/${normalizedSymbol}`,
      future: `https://futures.mexc.com/pt-PT/exchange/${normalizedSymbol}`
    },
    gate: {
      spot: `https://www.gate.io/pt/trade/${normalizedSymbol}`,
      future: `https://www.gate.io/pt/futures/USDT/${normalizedSymbol}`
    },
    gateio: {
      spot: `https://www.gate.io/pt/trade/${normalizedSymbol}`,
      future: `https://www.gate.io/pt/futures/USDT/${normalizedSymbol}`
    },
    bybit: {
      spot: `https://www.bybit.com/trade/spot/${simpleSymbol}/USDT`,
      future: `https://www.bybit.com/trade/usdt/${normalizedSymbol}`
    },
    kucoin: {
      spot: `https://www.kucoin.com/trade/${normalizedSymbol}`,
      future: `https://www.kucoin.com/futures/trade/${simpleSymbol}USDTM`
    },
    bitget: {
      spot: `https://www.bitget.com/spot/${simpleSymbol}USDT`,
      future: `https://www.bitget.com/futures/usdt/${simpleSymbol}USDT`
    },
    htx: {
      spot: `https://www.htx.com/trade/${simpleSymbol.toLowerCase()}_usdt?type=spot`,
      future: `https://www.htx.com/pt-pt/futures/linear_swap/exchange#contract_code=${simpleSymbol}-USDT`
    },
    bingx: {
      spot: `https://bingx.com/pt-br/spot/${simpleSymbol}USDT`,
      future: `https://bingx.com/pt-br/perpetual/${simpleSymbol}-USDT`
    },
    kcex: {
      spot: `https://www.kcex.com/exchange/${normalizedSymbol}`,
      future: `https://www.kcex.com/pt-PT/futures/exchange/${normalizedSymbol}`
    },
    coinext: {
      spot: `https://coinext.com.br/trade/${simpleSymbol.toLowerCase()}usdt`,
      future: `https://coinext.com.br/trade/${simpleSymbol.toLowerCase()}usdt`
    },
    mercado: {
      spot: `https://www.mercadobitcoin.com.br/negociacao/compra-e-venda/${simpleSymbol}`,
      future: `https://www.mercadobitcoin.com.br/negociacao/compra-e-venda/${simpleSymbol}`
    },
    novadax: {
      spot: `https://www.novadax.com/product/${simpleSymbol}_USDT`,
      future: `https://www.novadax.com/product/${simpleSymbol}_USDT`
    }
  };

  const exchangeConfig = exchangeUrls[lowerExchange];
  if (!exchangeConfig) return null;

  return market === 'FUTURES' ? exchangeConfig.future : exchangeConfig.spot;
}

/**
 * Abre as páginas de exchange em novas abas
 */
export function openExchangePages(
  symbol: string,
  buyExchange: string,
  buyMarket: 'SPOT' | 'FUTURES',
  sellExchange: string,
  sellMarket: 'SPOT' | 'FUTURES'
): void {
  const buyUrl = getExchangeUrl(symbol, buyExchange, buyMarket);
  const sellUrl = getExchangeUrl(symbol, sellExchange, sellMarket);

  if (buyUrl) window.open(buyUrl, '_blank');
  if (sellUrl) window.open(sellUrl, '_blank');
}
