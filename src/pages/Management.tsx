import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';
import DashboardHeader from '@/components/DashboardHeader';
import CompactArbitrageCalculator from '@/components/CompactArbitrageCalculator';

const ManagementPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [calculators, setCalculators] = useState<string[]>(['calc-1']);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const addCalculator = () => {
    const newId = `calc-${Date.now()}`;
    setCalculators(prev => [...prev, newId]);
  };

  const removeCalculator = (id: string) => {
    if (calculators.length > 1) {
      setCalculators(prev => prev.filter(calcId => calcId !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-8 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-gold" />
              <h1 className="text-2xl font-bold">Gerenciamento de Operações</h1>
            </div>
            <Button onClick={addCalculator} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Calculadora
            </Button>
          </div>

          {/* Grid de Calculadoras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {calculators.map(id => (
              <CompactArbitrageCalculator
                key={id}
                id={id}
                onRemove={removeCalculator}
              />
            ))}
          </div>

          {/* Dica */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Adicione múltiplas calculadoras para acompanhar várias operações simultaneamente
          </p>
        </main>
      </PageTransition>
    </div>
  );
};

export default ManagementPage;
