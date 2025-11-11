import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, Trash2, Plus } from 'lucide-react';
import { useSpreadAlerts } from '@/hooks/useSpreadAlerts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOpportunities } from '@/hooks/useOpportunities';

interface SpreadAlertsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SpreadAlertsManager = ({ open, onOpenChange }: SpreadAlertsManagerProps) => {
  const { alerts, addAlert, toggleAlert, deleteAlert } = useSpreadAlerts();
  const { opportunities } = useOpportunities();
  const [selectedPair, setSelectedPair] = useState('');
  const [targetSpread, setTargetSpread] = useState('');

  const handleAdd = () => {
    if (!selectedPair || !targetSpread) return;
    addAlert({ symbol: selectedPair, targetSpread: parseFloat(targetSpread) });
    setSelectedPair('');
    setTargetSpread('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" />
            Gerenciar Alertas de Spread
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar Novo Alerta */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold">Adicionar Novo Alerta</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {opportunities.map((opp) => (
                        <SelectItem key={opp.pair_symbol} value={opp.pair_symbol}>
                          {opp.pair_symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Spread Alvo (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={targetSpread}
                    onChange={(e) => setTargetSpread(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleAdd} 
                    className="w-full"
                    disabled={!selectedPair || !targetSpread}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Alertas */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Alertas Ativos ({alerts.length})</h3>
            
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum alerta configurado
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="outline" className="font-mono">
                            {alert.pair_symbol}
                          </Badge>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Spread ≥</span>
                            <Badge className="bg-gold/20 text-gold border-gold/30">
                              {alert.target_spread}%
                            </Badge>
                          </div>

                          <Badge 
                            variant={alert.is_active ? 'default' : 'secondary'}
                            className="ml-auto"
                          >
                            {alert.is_active ? 'Ativo' : 'Pausado'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={alert.is_active}
                            onCheckedChange={(checked) => 
                              toggleAlert({ id: alert.id, isActive: checked })
                            }
                          />
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAlert(alert.id)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpreadAlertsManager;
