import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Calculator, Settings2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StarBackground } from '@/components/StarBackground';
import { PageTransition } from '@/components/PageTransition';
import DashboardHeader from '@/components/DashboardHeader';
import CompactArbitrageCalculator from '@/components/CompactArbitrageCalculator';
import { useCalculatorStore } from '@/hooks/useCalculatorStore';

const ManagementPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { 
    calculators, 
    addCalculator, 
    removeCalculator, 
    reorderCalculators,
    profitThreshold,
    setProfitThreshold,
    soundEnabled,
    toggleSound
  } = useCalculatorStore();

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
            <div className="flex items-center gap-2">
              {/* Settings Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Configurações</h4>
                    
                    {/* Threshold */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Notificar lucro acima de (USD)
                      </Label>
                      <Input
                        type="number"
                        value={profitThreshold}
                        onChange={(e) => setProfitThreshold(parseFloat(e.target.value) || 0)}
                        className="h-8"
                        placeholder="1.00"
                        step="0.5"
                      />
                    </div>
                    
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
            Arraste para reorganizar • Calculadoras persistem entre sessões
          </p>
        </main>
      </PageTransition>
    </div>
  );
};

export default ManagementPage;
