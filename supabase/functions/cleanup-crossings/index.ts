import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar API key para proteção contra acesso não autorizado
    const monitorKey = req.headers.get('x-monitor-key');
    const expectedKey = Deno.env.get('MONITOR_API_KEY');

    if (!monitorKey || monitorKey !== expectedKey) {
      console.error('❌ Invalid or missing monitor API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== Cleanup Crossings Starting ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse body para opções customizadas
    let hoursToKeep = 24; // Padrão: manter apenas últimas 24 horas
    try {
      const body = await req.json();
      if (body.hoursToKeep && typeof body.hoursToKeep === 'number') {
        hoursToKeep = body.hoursToKeep;
      }
    } catch {
      // Sem body, usar padrão
    }

    // 1. Deletar cruzamentos mais antigos que X horas
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursToKeep);

    console.log(`🗑️ Deletando cruzamentos mais antigos que ${hoursToKeep}h (antes de ${cutoffTime.toISOString()})`);

    const { data: deletedOldData, error: deleteOldError } = await supabase
      .from('pair_crossings')
      .delete()
      .lt('timestamp', cutoffTime.toISOString())
      .select('id');

    if (deleteOldError) {
      console.error('Erro ao deletar cruzamentos antigos:', deleteOldError);
    }

    const deletedOldCount = deletedOldData?.length || 0;
    console.log(`✅ Deletados ${deletedOldCount} cruzamentos antigos (> ${hoursToKeep}h)`);

    // 2. Deletar cruzamentos com spreads inválidos (> 10% ou < 0%)
    const { data: deletedInvalidData, error: deleteInvalidError } = await supabase
      .from('pair_crossings')
      .delete()
      .or('spread_net_percent_saida.gt.10,spread_net_percent_saida.lt.0')
      .select('id');

    if (deleteInvalidError) {
      console.error('Erro ao deletar cruzamentos inválidos:', deleteInvalidError);
    }

    const deletedInvalidCount = deletedInvalidData?.length || 0;
    console.log(`✅ Deletados ${deletedInvalidCount} cruzamentos com spreads inválidos`);

    // 3. Limpar cooldowns antigos (mais de 1 hora)
    const cooldownCutoff = new Date();
    cooldownCutoff.setHours(cooldownCutoff.getHours() - 1);

    const { data: deletedCooldowns, error: deleteCooldownError } = await supabase
      .from('crossing_cooldowns')
      .delete()
      .lt('last_crossing_at', cooldownCutoff.toISOString())
      .select('pair_symbol');

    if (deleteCooldownError) {
      console.error('Erro ao deletar cooldowns antigos:', deleteCooldownError);
    }

    const deletedCooldownsCount = deletedCooldowns?.length || 0;
    console.log(`✅ Deletados ${deletedCooldownsCount} cooldowns antigos`);

    // 4. Limpar spread_history antigo (mais de 3 HORAS - períodos máximos do gráfico)
    const spreadHistoryCutoff = new Date();
    spreadHistoryCutoff.setHours(spreadHistoryCutoff.getHours() - 3);

    const { data: deletedSpreadHistory, error: deleteSpreadHistoryError } = await supabase
      .from('spread_history')
      .delete()
      .lt('timestamp', spreadHistoryCutoff.toISOString())
      .select('id');

    if (deleteSpreadHistoryError) {
      console.error('Erro ao deletar spread_history antigo:', deleteSpreadHistoryError);
    }

    const deletedSpreadHistoryCount = deletedSpreadHistory?.length || 0;
    console.log(`✅ Deletados ${deletedSpreadHistoryCount} registros de spread_history antigos (> 3h)`);

    // 5. Contar registros restantes
    const { count: remainingCount } = await supabase
      .from('pair_crossings')
      .select('*', { count: 'exact', head: true });

    const totalDeleted = deletedOldCount + deletedInvalidCount + deletedSpreadHistoryCount;

    console.log(`📊 Resumo:`);
    console.log(`   - Cruzamentos antigos removidos: ${deletedOldCount}`);
    console.log(`   - Cruzamentos inválidos removidos: ${deletedInvalidCount}`);
    console.log(`   - Cooldowns antigos removidos: ${deletedCooldownsCount}`);
    console.log(`   - Spread history antigo removido: ${deletedSpreadHistoryCount}`);
    console.log(`   - Total removido: ${totalDeleted}`);
    console.log(`   - Registros restantes: ${remainingCount || 0}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_old: deletedOldCount,
        deleted_invalid: deletedInvalidCount,
        deleted_cooldowns: deletedCooldownsCount,
        deleted_spread_history: deletedSpreadHistoryCount,
        total_deleted: totalDeleted,
        remaining_records: remainingCount || 0,
        message: `Limpeza concluída: ${totalDeleted} registros removidos, ${remainingCount || 0} restantes`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na limpeza de cruzamentos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
