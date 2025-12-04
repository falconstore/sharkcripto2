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
    console.log('=== Cleanup Crossings Starting ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Deletar cruzamentos mais antigos que 5 dias
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: deletedOldData, error: deleteOldError } = await supabase
      .from('pair_crossings')
      .delete()
      .lt('timestamp', fiveDaysAgo.toISOString())
      .select();

    if (deleteOldError) {
      console.error('Erro ao deletar cruzamentos antigos:', deleteOldError);
    }

    const deletedOldCount = deletedOldData?.length || 0;
    console.log(`✅ Deletados ${deletedOldCount} cruzamentos antigos (> 5 dias)`);

    // 2. Deletar cruzamentos com spreads inválidos (> 10% ou < 0%)
    const { data: deletedInvalidData, error: deleteInvalidError } = await supabase
      .from('pair_crossings')
      .delete()
      .or('spread_net_percent_saida.gt.10,spread_net_percent_saida.lt.0')
      .select();

    if (deleteInvalidError) {
      console.error('Erro ao deletar cruzamentos inválidos:', deleteInvalidError);
    }

    const deletedInvalidCount = deletedInvalidData?.length || 0;
    console.log(`✅ Deletados ${deletedInvalidCount} cruzamentos com spreads inválidos`);

    const totalDeleted = deletedOldCount + deletedInvalidCount;

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_old: deletedOldCount,
        deleted_invalid: deletedInvalidCount,
        total_deleted: totalDeleted,
        message: `Limpeza concluída: ${totalDeleted} registros removidos`
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
