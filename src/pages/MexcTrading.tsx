import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from '@/components/DashboardHeader';
import MexcConfigPanel from '@/components/MexcConfigPanel';
import MexcExecutionPanel from '@/components/MexcExecutionPanel';
import { Settings, Zap } from 'lucide-react';

const MexcTrading = () => {
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
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Execução Automática MEXC</h1>
          <p className="text-muted-foreground">
            Configure e execute operações de arbitragem automaticamente
          </p>
        </div>

        <Tabs defaultValue="execution" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="execution" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Execução
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-4">
            <MexcExecutionPanel />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <MexcConfigPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MexcTrading;
