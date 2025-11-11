-- Permitir que a Edge Function insira dados nas oportunidades
-- (SERVICE_ROLE_KEY já contorna RLS, mas isso garante que funcione)
CREATE POLICY "Edge functions podem inserir oportunidades"
  ON public.arbitrage_opportunities
  FOR INSERT
  WITH CHECK (true);

-- Permitir que a Edge Function atualize dados
CREATE POLICY "Edge functions podem atualizar oportunidades"
  ON public.arbitrage_opportunities
  FOR UPDATE
  USING (true);

-- Permitir que a Edge Function delete dados antigos
CREATE POLICY "Edge functions podem deletar oportunidades"
  ON public.arbitrage_opportunities
  FOR DELETE
  USING (true);