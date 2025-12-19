import { useEffect, useRef, useMemo, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TradingViewWidgetProps {
  symbol: string;
  exchange: string;
  market: 'spot' | 'future';
  height?: number;
}

const TradingViewWidget = memo(({ 
  symbol, 
  exchange, 
  market,
  height = 300 
}: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Formatar símbolo para TradingView
  // MEXC:BTCUSDT (spot) ou MEXC:BTCUSDTPERP (futures)
  const tvSymbol = useMemo(() => {
    const cleanSymbol = symbol.replace(/USDT|\/USDT|_USDT/gi, '').toUpperCase();
    const exchangeUpper = exchange.toUpperCase();
    const base = `${exchangeUpper}:${cleanSymbol}USDT`;
    return market === 'future' ? `${base}PERP` : base;
  }, [symbol, exchange, market]);

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

    // Criar e configurar script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '1',
      timezone: 'America/Sao_Paulo',
      theme: 'dark',
      style: '1',
      locale: 'br',
      enable_publishing: false,
      allow_symbol_change: false,
      save_image: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com'
    });

    scriptRef.current = script;
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
      scriptRef.current = null;
    };
  }, [tvSymbol, height]);

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
