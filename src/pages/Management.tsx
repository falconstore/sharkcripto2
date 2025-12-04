import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Calculator, Settings2, Volume2, VolumeX, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';
import DashboardHeader from '@/components/DashboardHeader';
import CompactArbitrageCalculator from '@/components/CompactArbitrageCalculator';
import { useCalculatorStore } from '@/hooks/useCalculatorStore';
import { useUserCalculators } from '@/hooks/useUserCalculators';

const ManagementPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { 
    calculators, 
    addCalculator, 
    removeCalculator, 
    reorderCalculators,
    soundEnabled,
    toggleSound,
    getTotalProfit
  } = useCalculatorStore();
  
  // Hook para sincronização com banco de dados
  useUserCalculators();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderCalculators(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Sort calculators by order
  const sortedCalculators = [...calculators].sort((a, b) => a.order - b.order);

  // Calculate global stats
  const totalProfit = getTotalProfit();
  const activeCalculators = calculators.filter(c => c.currentProfit !== 0).length;

  return (
    <div className="min-h-screen bg-background relative">
      <StarBackground />
      <DashboardHeader />
      
      <PageTransition>
        <main className="container mx-auto px-4 py-8 relative z-10">
          {/* Global Statistics Card */}
          <Card className="bg-gradient-card border-border/50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-profit/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-profit" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Total (Calculadoras)</p>
                    <p className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? 'text-profit' : 'text-negative'}`}>
                      {totalProfit.toFixed(2)} USDT
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{calculators.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Com Lucro</p>
                    <p className="text-xl font-bold text-profit">{activeCalculators}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-gold" />
              <h1 className="text-2xl font-bold">Gerenciamento de Operações</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Settings Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Configurações Globais</h4>
                    
                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {soundEnabled ? (
                          <Volume2 className="w-4 h-4 text-profit" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Label className="text-sm">Som de alerta</Label>
                      </div>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={toggleSound}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      O threshold de alerta é configurado individualmente em cada calculadora (em %).
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button onClick={addCalculator} className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Grid de Calculadoras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedCalculators.map((calc, index) => (
              <div
                key={calc.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-200 ${
                  dragOverIndex === index ? 'scale-105 ring-2 ring-primary/50' : ''
                }`}
              >
                <CompactArbitrageCalculator
                  id={calc.id}
                  onRemove={removeCalculator}
                  isDragging={draggedIndex === index}
                  dragHandleProps={{
                    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
                  }}
                />
              </div>
            ))}
          </div>

          {/* Dica */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Arraste para reorganizar • Configure o alerta em % em cada calculadora
          </p>
        </main>
      </PageTransition>
    </div>
  );
};

export default ManagementPage;
