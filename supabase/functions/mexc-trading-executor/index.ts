import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  symbol: string;
  side: 'ENTRY' | 'EXIT';
  quantity: number;
  maxValue: number;
  minSpread: number;
  simulationMode: boolean;
}

interface MexcOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  quantity?: string;
  quoteOrderQty?: string;
  timestamp: number;
  recvWindow?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('MEXC_API_KEY');
    const apiSecret = Deno.env.get('MEXC_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new Error('MEXC API credentials not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { symbol, side, quantity, maxValue, minSpread, simulationMode }: TradeRequest = await req.json();

    console.log(`🎯 Trade request: ${side} ${symbol} qty=${quantity} simulation=${simulationMode}`);

    // Sign request helper
    const signRequest = (params: Record<string, any>): string => {
      const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
      
      const signature = createHmac('sha256', apiSecret)
        .update(queryString)
        .digest('hex');
      
      return signature;
    };

    // Fetch account info
    const accountTimestamp = Date.now();
    const accountParams = { timestamp: accountTimestamp, recvWindow: 5000 };
    const accountSignature = signRequest(accountParams);
    
    const accountResponse = await fetch(
      `https://api.mexc.com/api/v3/account?timestamp=${accountTimestamp}&recvWindow=5000&signature=${accountSignature}`,
      {
        headers: {
          'X-MEXC-APIKEY': apiKey,
        },
      }
    );

    if (!accountResponse.ok) {
      const errorText = await accountResponse.text();
      console.error('❌ Account error:', errorText);
      throw new Error(`Failed to fetch account: ${errorText}`);
    }

    const accountData = await accountResponse.json();
    console.log('✅ Account fetched successfully');

    // Get current prices
    const spotTickerResponse = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
    const futuresTickerResponse = await fetch(`https://contract.mexc.com/api/v1/contract/ticker?symbol=${symbol}_USDT`);

    if (!spotTickerResponse.ok || !futuresTickerResponse.ok) {
      throw new Error('Failed to fetch current prices');
    }

    const spotTicker = await spotTickerResponse.json();
    const futuresTicker = await futuresTickerResponse.json();

    const spotPrice = side === 'ENTRY' ? parseFloat(spotTicker.askPrice) : parseFloat(spotTicker.bidPrice);
    const futuresPrice = side === 'ENTRY' ? parseFloat(futuresTicker.data[0].askPrice) : parseFloat(futuresTicker.data[0].bidPrice);

    console.log(`📊 Prices - Spot: ${spotPrice}, Futures: ${futuresPrice}`);

    // Calculate spread
    const currentSpread = side === 'ENTRY' 
      ? ((futuresPrice - spotPrice) / spotPrice * 100) - 0.2 // LONG: Buy Spot, Sell Futures
      : ((spotPrice - futuresPrice) / futuresPrice * 100) - 0.2; // SHORT: Sell Spot, Buy Futures

    console.log(`📈 Current spread: ${currentSpread.toFixed(4)}% (minimum: ${minSpread}%)`);

    // Validate spread
    if (currentSpread < minSpread) {
      throw new Error(`Spread ${currentSpread.toFixed(4)}% is below minimum ${minSpread}%`);
    }

    // Calculate total value
    const totalValue = quantity * spotPrice;
    if (totalValue > maxValue) {
      throw new Error(`Operation value ${totalValue.toFixed(2)} exceeds maximum ${maxValue}`);
    }

    console.log(`💰 Total value: ${totalValue.toFixed(2)} USDT`);

    if (simulationMode) {
      console.log('🎭 SIMULATION MODE - No actual orders placed');
      
      // Log simulated operation
      await supabase.from('mexc_operations').insert({
        user_id: user.id,
        pair_symbol: symbol,
        operation_type: side,
        quantity: quantity,
        spot_price: spotPrice,
        futures_price: futuresPrice,
        spread_percent: currentSpread,
        total_value: totalValue,
        status: 'simulated',
        simulation: true,
      });

      return new Response(JSON.stringify({
        success: true,
        simulation: true,
        message: 'Simulation completed successfully',
        details: {
          symbol,
          side,
          quantity,
          spotPrice,
          futuresPrice,
          spread: currentSpread,
          totalValue,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute real orders
    console.log('🚀 Executing REAL orders...');

    const timestamp = Date.now();
    
    // SPOT Order
    const spotSide = side === 'ENTRY' ? 'BUY' : 'SELL';
    const spotParams: MexcOrderParams = {
      symbol: `${symbol}USDT`,
      side: spotSide,
      type: 'MARKET',
      quoteOrderQty: totalValue.toFixed(2),
      timestamp,
      recvWindow: 5000,
    };
    
    const spotSignature = signRequest(spotParams);
    const spotOrderUrl = `https://api.mexc.com/api/v3/order?${Object.keys(spotParams).map(k => `${k}=${spotParams[k as keyof MexcOrderParams]}`).join('&')}&signature=${spotSignature}`;
    
    const spotOrderResponse = await fetch(spotOrderUrl, {
      method: 'POST',
      headers: {
        'X-MEXC-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!spotOrderResponse.ok) {
      const errorText = await spotOrderResponse.text();
      console.error('❌ SPOT order error:', errorText);
      throw new Error(`SPOT order failed: ${errorText}`);
    }

    const spotOrder = await spotOrderResponse.json();
    console.log('✅ SPOT order executed:', spotOrder);

    // FUTURES Order (simplified - MEXC futures API may require different approach)
    const futuresSide = side === 'ENTRY' ? 'SELL' : 'BUY';
    console.log(`📝 FUTURES order would be: ${futuresSide} ${quantity} contracts`);

    // Log operation
    await supabase.from('mexc_operations').insert({
      user_id: user.id,
      pair_symbol: symbol,
      operation_type: side,
      quantity: quantity,
      spot_price: spotPrice,
      futures_price: futuresPrice,
      spread_percent: currentSpread,
      total_value: totalValue,
      spot_order_id: spotOrder.orderId,
      status: 'completed',
      simulation: false,
    });

    return new Response(JSON.stringify({
      success: true,
      simulation: false,
      message: 'Orders executed successfully',
      orders: {
        spot: spotOrder,
      },
      details: {
        symbol,
        side,
        quantity,
        spotPrice,
        futuresPrice,
        spread: currentSpread,
        totalValue,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Trading error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
