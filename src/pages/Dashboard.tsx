import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardHeader from '@/components/DashboardHeader';
import OpportunitiesTable from '@/components/OpportunitiesTable';
import ArbitrageHeatmap from '@/components/ArbitrageHeatmap';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
            <div className="text-sm text-muted-foreground mb-1">Oportunidades Ativas</div>
            <div className="text-3xl font-bold text-gold">--</div>
          </div>
          <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
            <div className="text-sm text-muted-foreground mb-1">Melhor Spread</div>
            <div className="text-3xl font-bold text-profit">--%</div>
          </div>
          <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
            <div className="text-sm text-muted-foreground mb-1">Volume Total 24h</div>
            <div className="text-3xl font-bold">$--</div>
          </div>
        </div>

        {/* Heatmap */}
        <ArbitrageHeatmap />

        {/* Tabela de Oportunidades */}
        <OpportunitiesTable />
      </main>
    </div>
  );
};

export default Dashboard;