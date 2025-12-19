import { useEffect, useRef, useMemo, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  spotExchange: string;
  futuresExchange: string;
  height?: number;
}

const TradingViewWidget = memo(({ 
  symbol, 
  spotExchange,
  futuresExchange,
  height = 400 
}: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Formatar símbolos para TradingView
  // MEXC:BTCUSDT (spot) e MEXC:BTCUSDTPERP (futures)
  const { spotSymbol, futuresSymbol } = useMemo(() => {
    const cleanSymbol = symbol.replace(/USDT|\/USDT|_USDT/gi, '').toUpperCase();
    const spotEx = spotExchange.toUpperCase();
    const futEx = futuresExchange.toUpperCase();
    
    return {
      spotSymbol: `${spotEx}:${cleanSymbol}USDT`,
      futuresSymbol: `${futEx}:${cleanSymbol}USDTPERP`
    };
  }, [symbol, spotExchange, futuresExchange]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Limpar scripts anteriores
    const container = containerRef.current;
    container.innerHTML = '';

    // Criar wrapper do widget
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container__widget';
    widgetWrapper.style.height = `${height}px`;
    widgetWrapper.style.width = '100%';
    container.appendChild(widgetWrapper);

    // Criar e configurar script - usando symbol-overview para comparação
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[
        symbol.toUpperCase(),
        `${spotSymbol}|5`  // Símbolo Spot + intervalo 5min
      ]],
      compareSymbols: [{
        symbol: futuresSymbol,
        lineColor: "rgba(139, 92, 246, 1)",  // Violet para Futures
        lineWidth: 2
      }],
      chartOnly: false,
      width: "100%",
      height: height,
      locale: "br",
      colorTheme: "dark",
      autosize: true,
      showVolume: true,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",  // Escala regular
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "line",  // Gráfico de linha
      lineWidth: 2,
      lineType: 0,
      lineColor: "rgba(34, 211, 238, 1)",  // Cyan para Spot
      dateRanges: [
        "1d|5",
        "1m|30",
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
      ]
    });

    scriptRef.current = script;
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
      scriptRef.current = null;
    };
  }, [spotSymbol, futuresSymbol, symbol, height]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="tradingview-widget-container w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';

export default TradingViewWidget;
