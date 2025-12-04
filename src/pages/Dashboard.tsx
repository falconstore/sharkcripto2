import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCrossingNotifications } from '@/hooks/useCrossingNotifications';
import { useSpreadAlerts } from '@/hooks/useSpreadAlerts';
import { useOpportunities } from '@/hooks/useOpportunities';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardStats from '@/components/DashboardStats';
import MonitoringStatus from '@/components/MonitoringStatus';
import StartMonitoringButton from '@/components/StartMonitoringButton';
import OpportunitiesTable from '@/components/OpportunitiesTable';
import ImprovedArbitrageCalculator from '@/components/ImprovedArbitrageCalculator';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { opportunities } = useOpportunities();
  const { checkAlerts } = useSpreadAlerts();
  
  // Ativar notificações em tempo real
  useCrossingNotifications();

  // Verificar alertas quando oportunidades mudarem
  useEffect(() => {
    if (opportunities.length > 0) {
      checkAlerts(opportunities);
    }
  }, [opportunities, checkAlerts]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-8 space-y-8 relative z-10">
          {/* Botões de Ação */}
          <div className="flex justify-center gap-3">
            <StartMonitoringButton />
            <ImprovedArbitrageCalculator />
          </div>

          {/* Status do Monitoramento */}
          <MonitoringStatus />

          {/* Stats Cards */}
          <DashboardStats />

          {/* Tabela de Oportunidades */}
          <OpportunitiesTable />
        </main>
      </PageTransition>
    </div>
  );
};

export default Dashboard;
