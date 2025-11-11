import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardStats from '@/components/DashboardStats';
import MonitoringStatus from '@/components/MonitoringStatus';
import StartMonitoringButton from '@/components/StartMonitoringButton';
import OpportunitiesTable from '@/components/OpportunitiesTable';
import BlacklistPanel from '@/components/BlacklistPanel';

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
        {/* Botão para Iniciar Monitoramento */}
        <div className="flex justify-center">
          <StartMonitoringButton />
        </div>

        {/* Status do Monitoramento */}
        <MonitoringStatus />

        {/* Stats Cards */}
        <DashboardStats />

        {/* Painel de Blacklist */}
        <BlacklistPanel />

        {/* Tabela de Oportunidades */}
        <OpportunitiesTable />
      </main>
    </div>
  );
};

export default Dashboard;