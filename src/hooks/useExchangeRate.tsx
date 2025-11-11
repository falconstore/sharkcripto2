import { useState, useEffect } from 'react';

interface ExchangeRateResult {
  rate: number;
  source: string;
  lastUpdate: Date;
  isLoading: boolean;
  error: string | null;
}

const FALLBACK_APIS = [
  {
    name: 'currency-api',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    extract: (data: any) => data?.usd?.brl
  },
  {
    name: 'er-api',
    url: 'https://open.er-api.com/v6/latest/USD',
    extract: (data: any) => data?.rates?.BRL
  },
  {
    name: 'exchangerate-host',
    url: 'https://api.exchangerate.host/latest?base=USD&symbols=BRL',
    extract: (data: any) => data?.rates?.BRL
  },
  {
    name: 'awesomeapi',
    url: 'https://economia.awesomeapi.com.br/json/last/USD-BRL',
    extract: (data: any) => data?.USDBRL?.bid || data?.USDBRL?.ask
  }
];

export const useExchangeRate = () => {
  const [result, setResult] = useState<ExchangeRateResult>({
    rate: 5.70,
    source: 'default',
    lastUpdate: new Date(),
    isLoading: true,
    error: null
  });

  const fetchRate = async () => {
    for (const api of FALLBACK_APIS) {
      try {
        const response = await fetch(api.url);
        const data = await response.json();
        const rate = Number(api.extract(data));
        
        if (isFinite(rate) && rate > 0) {
          setResult({
            rate,
            source: api.name,
            lastUpdate: new Date(),
            isLoading: false,
            error: null
          });
          return;
        }
      } catch (error) {
        console.warn(`Falha ao buscar de ${api.name}:`, error);
        continue;
      }
    }
    
    setResult(prev => ({
      ...prev,
      isLoading: false,
      error: 'Todas as APIs falharam. Usando taxa padrão.'
    }));
  };

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return result;
};
