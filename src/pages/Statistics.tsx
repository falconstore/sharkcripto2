import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardHeader from '@/components/DashboardHeader';
import StatisticsFilters from '@/components/StatisticsFilters';
import CrossingKPICards from '@/components/CrossingKPICards';
import CrossingTimeSeriesChart from '@/components/CrossingTimeSeriesChart';
import CrossingHourDistribution from '@/components/CrossingHourDistribution';
import CrossingRankingTable from '@/components/CrossingRankingTable';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';
import { useStatistics, Period } from '@/hooks/useStatistics';
import { toast } from 'sonner';

const Statistics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('24h');
  
  const { kpiData, timeSeriesData, hourDistribution, coinRanking, loading, refetch } = useStatistics(period);

  const handleExport = () => {
    const data = {
      period,
      kpiData,
      timeSeriesData,
      hourDistribution,
      coinRanking,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics-${period}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso!');
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Dados atualizados!');
  };

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-6 space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="hover:bg-primary/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gradient-gold">Estatísticas de Cruzamentos</h1>
                <p className="text-sm text-muted-foreground">
                  Análise detalhada dos spreads de saída
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="hover:border-primary/50">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="hover:border-gold/50">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <StatisticsFilters
            period={period}
            onPeriodChange={setPeriod}
          />

          {/* KPIs */}
          <CrossingKPICards data={kpiData} loading={loading} />

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CrossingTimeSeriesChart data={timeSeriesData} loading={loading} period={period} />
            <CrossingHourDistribution data={hourDistribution} loading={loading} />
          </div>

          {/* Ranking */}
          <CrossingRankingTable data={coinRanking} loading={loading} />
        </main>
      </PageTransition>
    </div>
  );
};

export default Statistics;
