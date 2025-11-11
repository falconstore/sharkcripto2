import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMexcConfig } from '@/hooks/useMexcConfig';
import { AlertTriangle, CheckCircle2, Settings2, Shield } from 'lucide-react';

const MexcConfigPanel = () => {
  const {
    apiConfigured,
    minSpread,
    maxOperationValue,
    minSpotVolume,
    minFuturesVolume,
    simulationMode,
    autoConfirm,
    setMinSpread,
    setMaxOperationValue,
    setMinSpotVolume,
    setMinFuturesVolume,
    setSimulationMode,
    setAutoConfirm,
  } = useMexcConfig();

  return (
    <div className="space-y-6">
      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Status da API MEXC
          </CardTitle>
          <CardDescription>
            Verifique se suas credenciais estão configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {apiConfigured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">API Configurada</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Ativo
                </Badge>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm">API Keys adicionadas via secrets</span>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Configurado
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações de Segurança
          </CardTitle>
          <CardDescription>
            Defina limites e proteções para suas operações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Simulation Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Modo Simulação</Label>
              <p className="text-sm text-muted-foreground">
                Teste operações sem executar ordens reais
              </p>
            </div>
            <Switch
              checked={simulationMode}
              onCheckedChange={setSimulationMode}
            />
          </div>

          {simulationMode && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Modo simulação ativo. Nenhuma ordem será executada na exchange.
              </AlertDescription>
            </Alert>
          )}

          {/* Auto Confirm */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirmação Automática</Label>
              <p className="text-sm text-muted-foreground">
                Executar sem diálogo de confirmação
              </p>
            </div>
            <Switch
              checked={autoConfirm}
              onCheckedChange={setAutoConfirm}
            />
          </div>

          {/* Min Spread */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Spread Mínimo (%)</Label>
              <span className="text-sm font-medium">{minSpread.toFixed(2)}%</span>
            </div>
            <Slider
              value={[minSpread]}
              onValueChange={([value]) => setMinSpread(value)}
              min={0}
              max={5}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Operações com spread abaixo deste valor serão bloqueadas
            </p>
          </div>

          {/* Max Operation Value */}
          <div className="space-y-3">
            <Label>Valor Máximo por Operação (USDT)</Label>
            <Input
              type="number"
              value={maxOperationValue}
              onChange={(e) => setMaxOperationValue(Number(e.target.value))}
              min={0}
              step={100}
            />
            <p className="text-xs text-muted-foreground">
              Limite máximo em USDT para cada operação
            </p>
          </div>

          {/* Min Spot Volume */}
          <div className="space-y-3">
            <Label>Volume Mínimo Spot (USDT)</Label>
            <Input
              type="number"
              value={minSpotVolume}
              onChange={(e) => setMinSpotVolume(Number(e.target.value))}
              min={0}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Pares com volume spot abaixo deste valor não aparecerão
            </p>
          </div>

          {/* Min Futures Volume */}
          <div className="space-y-3">
            <Label>Volume Mínimo Futuros (USDT)</Label>
            <Input
              type="number"
              value={minFuturesVolume}
              onChange={(e) => setMinFuturesVolume(Number(e.target.value))}
              min={0}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Pares com volume futuros abaixo deste valor não aparecerão
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MexcConfigPanel;
