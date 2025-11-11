-- Remover o cron job de limpeza já que não armazenamos mais dados no banco
SELECT cron.unschedule('cleanup-arbitrage-opportunities');