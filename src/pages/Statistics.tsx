import { useState } from 'react';
import { useStatistics, Period } from '@/hooks/useStatistics';
import { usePreferences } from '@/hooks/usePreferences';
import DashboardHeader from '@/components/DashboardHeader';
import StatisticsFilters from '@/components/StatisticsFilters';
import CrossingKPICards from '@/components/CrossingKPICards';
import CrossingTimeSeriesChart from '@/components/CrossingTimeSeriesChart';
import CrossingRankingTable from '@/components/CrossingRankingTable';
import CrossingHourDistribution from '@/components/CrossingHourDistribution';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Statistics = () => {
  const navigate = useNavigate();
  const { blacklist } = usePreferences();
  const [period, setPeriod] = useState<Period>('today');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [filterCoins, setFilterCoins] = useState<string[]>([]);

  const { kpiData, timeSeriesData, hourDistribution, coinRanking, loading, error, refetch } = 
    useStatistics(period, customStart, customEnd, blacklist);

  const handleExport = () => {
    try {
      const exportData = {
        period,
        kpis: kpiData,
        ranking: coinRanking,
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estatisticas-cruzamentos-${period}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
      console.error('Erro ao exportar:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Botão voltar */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>

        {/* Header da página */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Estatísticas de Cruzamentos</h1>
            <p className="text-muted-foreground mt-1">
              Análise detalhada dos cruzamentos de spread
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <StatisticsFilters
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          filterCoins={filterCoins}
          onFilterCoinsChange={setFilterCoins}
        />

        {/* KPIs */}
        <CrossingKPICards data={kpiData} loading={loading} />

        {/* Gráfico de série temporal */}
        <CrossingTimeSeriesChart
          data={timeSeriesData}
          loading={loading}
          period={period}
        />

        {/* Grid com dois gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por hora */}
          <CrossingHourDistribution
            data={hourDistribution}
            loading={loading}
          />

          {/* Tabela de ranking */}
          <CrossingRankingTable
            data={coinRanking}
            loading={loading}
          />
        </div>
      </main>
    </div>
  );
};

export default Statistics;
