import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, DollarSign, TrendingUp } from 'lucide-react';

const ArbitrageCalculator = () => {
  const [valorInvestido, setValorInvestido] = useState<string>('');
  const [entradaSpot, setEntradaSpot] = useState<string>('');
  const [entradaFuturo, setEntradaFuturo] = useState<string>('');
  const [fechamentoSpot, setFechamentoSpot] = useState<string>('');
  const [fechamentoFuturo, setFechamentoFuturo] = useState<string>('');

  const [lucroUSD, setLucroUSD] = useState<number>(0);
  const [lucroBRL, setLucroBRL] = useState<number>(0);
  const [varEntrada, setVarEntrada] = useState<number>(0);
  const [varFech, setVarFech] = useState<number>(0);
  const [varTotal, setVarTotal] = useState<number>(0);

  const taxaCambioAtual = 5.70; // Pode ser atualizada dinamicamente
  const TAXA = 0.001; // 0.1%

  const calcular = () => {
    const valor = parseFloat(valorInvestido) || 0;
    const spotEntrada = parseFloat(entradaSpot) || 0;
    const futuroEntrada = parseFloat(entradaFuturo) || 0;
    const spotFechamento = parseFloat(fechamentoSpot) || 0;
    const futuroFechamento = parseFloat(fechamentoFuturo) || 0;

    if (!valor || !spotEntrada || !futuroEntrada) {
      setLucroUSD(0);
      setLucroBRL(0);
      setVarEntrada(0);
      setVarFech(0);
      setVarTotal(0);
      return;
    }

    const variacaoEntrada = (futuroEntrada / spotEntrada - 1);
    const variacaoFechamento = (spotFechamento > 0 && futuroFechamento > 0)
      ? ((spotFechamento - futuroFechamento) / spotFechamento)
      : 0;
    const variacaoTotal = variacaoEntrada + variacaoFechamento;

    const lucroEmUSD = (valor * variacaoTotal) * (1 - TAXA);
    const lucroEmBRL = lucroEmUSD * taxaCambioAtual;

    setLucroUSD(lucroEmUSD);
    setLucroBRL(lucroEmBRL);
    setVarEntrada(variacaoEntrada * 100);
    setVarFech(variacaoFechamento * 100);
    setVarTotal(variacaoTotal * 100);
  };

  const limpar = () => {
    setValorInvestido('');
    setEntradaSpot('');
    setEntradaFuturo('');
    setFechamentoSpot('');
    setFechamentoFuturo('');
    setLucroUSD(0);
    setLucroBRL(0);
    setVarEntrada(0);
    setVarFech(0);
    setVarTotal(0);
  };

  return (
    <Card className="bg-gradient-card hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-gold" />
          Calculadora de Arbitragem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valorInvestido" className="text-sm font-medium">
              Valor Investido (USD)
            </Label>
            <Input
              id="valorInvestido"
              type="number"
              placeholder="0.00"
              value={valorInvestido}
              onChange={(e) => setValorInvestido(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entradaSpot" className="text-sm font-medium">
              Entrada Spot
            </Label>
            <Input
              id="entradaSpot"
              type="number"
              placeholder="0.00000000"
              value={entradaSpot}
              onChange={(e) => setEntradaSpot(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entradaFuturo" className="text-sm font-medium">
              Entrada Futuro
            </Label>
            <Input
              id="entradaFuturo"
              type="number"
              placeholder="0.00000000"
              value={entradaFuturo}
              onChange={(e) => setEntradaFuturo(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechamentoSpot" className="text-sm font-medium">
              Fechamento Spot (opcional)
            </Label>
            <Input
              id="fechamentoSpot"
              type="number"
              placeholder="0.00000000"
              value={fechamentoSpot}
              onChange={(e) => setFechamentoSpot(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechamentoFuturo" className="text-sm font-medium">
              Fechamento Futuro (opcional)
            </Label>
            <Input
              id="fechamentoFuturo"
              type="number"
              placeholder="0.00000000"
              value={fechamentoFuturo}
              onChange={(e) => setFechamentoFuturo(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button onClick={calcular} className="flex-1 bg-gradient-primary">
            <Calculator className="w-4 h-4 mr-2" />
            Calcular
          </Button>
          <Button onClick={limpar} variant="outline">
            Limpar
          </Button>
        </div>

        {/* Resultados */}
        {(lucroUSD !== 0 || varTotal !== 0) && (
          <div className="space-y-4 p-4 bg-accent/30 rounded-lg border border-border animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Lucro em USD</div>
                <div className={`text-2xl font-bold font-mono ${lucroUSD >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  <DollarSign className="inline w-5 h-5" />
                  {lucroUSD.toFixed(2)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Lucro em BRL (R$ {taxaCambioAtual.toFixed(2)})</div>
                <div className={`text-2xl font-bold font-mono ${lucroBRL >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  R$ {lucroBRL.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Var. Entrada</div>
                <div className={`text-lg font-bold font-mono ${varEntrada >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  <TrendingUp className="inline w-4 h-4 mr-1" />
                  {varEntrada.toFixed(4)}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Var. Fechamento</div>
                <div className={`text-lg font-bold font-mono ${varFech >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  <TrendingUp className="inline w-4 h-4 mr-1" />
                  {varFech.toFixed(4)}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Var. Total</div>
                <div className={`text-lg font-bold font-mono ${varTotal >= 0 ? 'text-gold' : 'text-destructive'}`}>
                  <TrendingUp className="inline w-4 h-4 mr-1" />
                  {varTotal.toFixed(4)}%
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
              Taxa de {(TAXA * 100).toFixed(2)}% já descontada
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArbitrageCalculator;
