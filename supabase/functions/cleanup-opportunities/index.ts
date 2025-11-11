import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Cleanup Opportunities Starting ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Deletar todas as oportunidades da tabela
    const { error, count } = await supabase
      .from('arbitrage_opportunities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo (condição sempre verdadeira)

    if (error) {
      console.error('❌ Error deleting opportunities:', error);
      throw error;
    }

    console.log(`✅ Deleted all opportunities from database`);

    return new Response(
      JSON.stringify({ 
        message: 'Tabela limpa com sucesso',
        status: 'completed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fatal error in cleanup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
