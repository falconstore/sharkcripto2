import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Calculator, ExternalLink, X, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FloatingArbitrageCalculatorProps {
  initialSpotAbertura?: number;
  initialShortAbertura?: number;
  className?: string;
}

export const FloatingArbitrageCalculator = ({
  initialSpotAbertura,
  initialShortAbertura,
  className
}: FloatingArbitrageCalculatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aberturaSpot, setAberturaSpot] = useState(initialSpotAbertura?.toString() || '');
  const [aberturaShort, setAberturaShort] = useState(initialShortAbertura?.toString() || '');
  const [fechamentoSpot, setFechamentoSpot] = useState('');
  const [fechamentoShort, setFechamentoShort] = useState('');
  const pipWindowRef = useRef<Window | null>(null);

  // Atualizar valores iniciais quando props mudarem
  useEffect(() => {
    if (initialSpotAbertura !== undefined) {
      setAberturaSpot(initialSpotAbertura.toString());
    }
    if (initialShortAbertura !== undefined) {
      setAberturaShort(initialShortAbertura.toString());
    }
  }, [initialSpotAbertura, initialShortAbertura]);

  // Cálculo do lucro de entrada: ((short / spot - 1) * 100)
  const lucroEntrada = useMemo(() => {
    const spot = parseFloat(aberturaSpot);
    const short = parseFloat(aberturaShort);
    if (!spot || !short || spot <= 0 || short <= 0) return null;
    return ((short / spot - 1) * 100);
  }, [aberturaSpot, aberturaShort]);

  // Cálculo do lucro de fechamento: (((short / spot - 1) * -1) * 100)
  const lucroFechamento = useMemo(() => {
    const spot = parseFloat(fechamentoSpot);
    const short = parseFloat(fechamentoShort);
    if (!spot || !short || spot <= 0 || short <= 0) return null;
    return (((short / spot - 1) * -1) * 100);
  }, [fechamentoSpot, fechamentoShort]);

  // Spread final: entrada + saída
  const spreadFinal = useMemo(() => {
    if (lucroEntrada === null || lucroFechamento === null) return null;
    return lucroEntrada + lucroFechamento;
  }, [lucroEntrada, lucroFechamento]);

  const limpar = useCallback(() => {
    setAberturaSpot('');
    setAberturaShort('');
    setFechamentoSpot('');
    setFechamentoShort('');
  }, []);

  const getColorClass = (value: number | null) => {
    if (value === null) return 'text-muted-foreground';
    if (value > 0) return 'text-profit';
    if (value < 0) return 'text-loss';
    return 'text-muted-foreground';
  };

  const formatResult = (value: number | null) => {
    if (value === null) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(3)}%`;
  };

  // Abrir em janela flutuante usando Picture-in-Picture
  const openFloatingWindow = async () => {
    // Fecha o popover
    setIsOpen(false);

    // Verifica se o navegador suporta Picture-in-Picture para documentos
    if (!('documentPictureInPicture' in window)) {
      alert('Seu navegador não suporta Picture-in-Picture para documentos. Tente usar Chrome 116+.');
      return;
    }

    try {
      // @ts-ignore - API ainda não tem tipos oficiais
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 420,
        height: 540
      });

      pipWindowRef.current = pipWindow;

      // Estilos para a janela PiP
      const styles = `
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            background: hsl(222 47% 6%);
            font-family: system-ui, -apple-system, sans-serif;
            color: hsl(210 40% 98%);
            padding: 16px;
          }
          .card {
            background: hsl(222 47% 8%);
            border: 1px solid hsl(217 33% 17%);
            border-radius: 12px;
            overflow: hidden;
          }
          .card-header {
            background: linear-gradient(135deg, hsl(250 56% 50%), hsl(250 56% 40%));
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .card-title {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .card-body {
            padding: 16px;
          }
          .section {
            margin-bottom: 16px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: hsl(215 20% 65%);
            margin-bottom: 8px;
          }
          .input-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
          }
          .input-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .input-label {
            font-size: 11px;
            color: hsl(215 20% 65%);
          }
          input {
            width: 100%;
            padding: 8px 12px;
            background: hsl(222 47% 6%);
            border: 1px solid hsl(217 33% 25%);
            border-radius: 6px;
            color: hsl(210 40% 98%);
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }
          input:focus {
            border-color: hsl(250 56% 50%);
          }
          input::placeholder {
            color: hsl(215 20% 40%);
          }
          .result {
            padding: 8px 12px;
            background: hsl(222 47% 6%);
            border: 1px solid hsl(217 33% 17%);
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
          }
          .result.positive { color: hsl(142 71% 45%); }
          .result.negative { color: hsl(0 84% 60%); }
          .result.neutral { color: hsl(215 20% 65%); }
          .divider {
            height: 1px;
            background: hsl(217 33% 17%);
            margin: 16px 0;
          }
          .spread-final {
            padding: 16px;
            background: linear-gradient(135deg, hsl(222 47% 10%), hsl(222 47% 8%));
            border: 1px solid hsl(217 33% 20%);
            border-radius: 8px;
            text-align: center;
          }
          .spread-final-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: hsl(215 20% 65%);
            margin-bottom: 4px;
          }
          .spread-final-value {
            font-size: 24px;
            font-weight: 700;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
          }
          .btn-secondary {
            background: hsl(217 33% 17%);
            border-color: hsl(217 33% 25%);
            color: hsl(210 40% 98%);
          }
          .btn-secondary:hover {
            background: hsl(217 33% 22%);
          }
          .btn-row {
            display: flex;
            gap: 8px;
            margin-top: 16px;
          }
        </style>
      `;

      const currentValues = {
        aberturaSpot,
        aberturaShort,
        fechamentoSpot,
        fechamentoShort
      };

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Calculadora de Arbitragem</title>
            ${styles}
          </head>
          <body>
            <div class="card">
              <div class="card-header">
                <div class="card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="2" width="16" height="20" rx="2"/>
                    <line x1="8" x2="16" y1="6" y2="6"/>
                    <line x1="16" x2="16" y1="14" y2="18"/>
                    <path d="m8 10 8 8"/>
                    <path d="m8 18 8-8"/>
                  </svg>
                  Calculadora de Arbitragem
                </div>
              </div>
              <div class="card-body">
                <div class="section">
                  <div class="section-title">Abertura</div>
                  <div class="input-row">
                    <div class="input-group">
                      <span class="input-label">Preço Spot</span>
                      <input type="number" id="abertura-spot" step="any" placeholder="0.0000" value="${currentValues.aberturaSpot}">
                    </div>
                    <div class="input-group">
                      <span class="input-label">Preço Short</span>
                      <input type="number" id="abertura-short" step="any" placeholder="0.0000" value="${currentValues.aberturaShort}">
                    </div>
                  </div>
                  <div class="result neutral" id="lucro-entrada">—</div>
                </div>

                <div class="divider"></div>

                <div class="section">
                  <div class="section-title">Fechamento</div>
                  <div class="input-row">
                    <div class="input-group">
                      <span class="input-label">Preço Spot</span>
                      <input type="number" id="fechamento-spot" step="any" placeholder="0.0000" value="${currentValues.fechamentoSpot}">
                    </div>
                    <div class="input-group">
                      <span class="input-label">Preço Short</span>
                      <input type="number" id="fechamento-short" step="any" placeholder="0.0000" value="${currentValues.fechamentoShort}">
                    </div>
                  </div>
                  <div class="result neutral" id="lucro-fechamento">—</div>
                </div>

                <div class="divider"></div>

                <div class="spread-final">
                  <div class="spread-final-label">Spread Final</div>
                  <div class="spread-final-value neutral" id="spread-final">—</div>
                </div>

                <div class="btn-row">
                  <button class="btn btn-secondary" onclick="limpar()" style="flex: 1;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M8 16H3v5"/>
                    </svg>
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            <script>
              function calcularAbertura() {
                const spot = parseFloat(document.getElementById('abertura-spot').value);
                const short = parseFloat(document.getElementById('abertura-short').value);
                const el = document.getElementById('lucro-entrada');
                
                if (!spot || !short || spot <= 0 || short <= 0) {
                  el.textContent = '—';
                  el.className = 'result neutral';
                  calcularSpreadFinal();
                  return null;
                }
                
                const resultado = ((short / spot - 1) * 100);
                const sign = resultado > 0 ? '+' : '';
                el.textContent = sign + resultado.toFixed(3) + '%';
                el.className = 'result ' + (resultado > 0 ? 'positive' : resultado < 0 ? 'negative' : 'neutral');
                calcularSpreadFinal();
                return resultado;
              }

              function calcularFechamento() {
                const spot = parseFloat(document.getElementById('fechamento-spot').value);
                const short = parseFloat(document.getElementById('fechamento-short').value);
                const el = document.getElementById('lucro-fechamento');
                
                if (!spot || !short || spot <= 0 || short <= 0) {
                  el.textContent = '—';
                  el.className = 'result neutral';
                  calcularSpreadFinal();
                  return null;
                }
                
                const resultado = (((short / spot - 1) * -1) * 100);
                const sign = resultado > 0 ? '+' : '';
                el.textContent = sign + resultado.toFixed(3) + '%';
                el.className = 'result ' + (resultado > 0 ? 'positive' : resultado < 0 ? 'negative' : 'neutral');
                calcularSpreadFinal();
                return resultado;
              }

              function calcularSpreadFinal() {
                const spot1 = parseFloat(document.getElementById('abertura-spot').value);
                const short1 = parseFloat(document.getElementById('abertura-short').value);
                const spot2 = parseFloat(document.getElementById('fechamento-spot').value);
                const short2 = parseFloat(document.getElementById('fechamento-short').value);
                const el = document.getElementById('spread-final');
                
                if (!spot1 || !short1 || spot1 <= 0 || short1 <= 0 ||
                    !spot2 || !short2 || spot2 <= 0 || short2 <= 0) {
                  el.textContent = '—';
                  el.className = 'spread-final-value neutral';
                  return;
                }
                
                const lucroEntrada = ((short1 / spot1 - 1) * 100);
                const lucroFechamento = (((short2 / spot2 - 1) * -1) * 100);
                const resultado = lucroEntrada + lucroFechamento;
                
                const sign = resultado > 0 ? '+' : '';
                el.textContent = sign + resultado.toFixed(3) + '%';
                el.className = 'spread-final-value ' + (resultado > 0 ? 'positive' : resultado < 0 ? 'negative' : 'neutral');
              }

              function limpar() {
                document.getElementById('abertura-spot').value = '';
                document.getElementById('abertura-short').value = '';
                document.getElementById('fechamento-spot').value = '';
                document.getElementById('fechamento-short').value = '';
                document.getElementById('lucro-entrada').textContent = '—';
                document.getElementById('lucro-entrada').className = 'result neutral';
                document.getElementById('lucro-fechamento').textContent = '—';
                document.getElementById('lucro-fechamento').className = 'result neutral';
                document.getElementById('spread-final').textContent = '—';
                document.getElementById('spread-final').className = 'spread-final-value neutral';
              }

              // Event listeners
              document.getElementById('abertura-spot').addEventListener('input', calcularAbertura);
              document.getElementById('abertura-short').addEventListener('input', calcularAbertura);
              document.getElementById('fechamento-spot').addEventListener('input', calcularFechamento);
              document.getElementById('fechamento-short').addEventListener('input', calcularFechamento);

              // Calcular valores iniciais
              calcularAbertura();
              calcularFechamento();
            </script>
          </body>
        </html>
      `;

      pipWindow.document.write(html);
      pipWindow.document.close();

      // Quando a janela PiP fechar
      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
      });

    } catch (error) {
      console.error('Erro ao abrir Picture-in-Picture:', error);
      alert('Não foi possível abrir a janela flutuante. Verifique se você está usando Chrome 116+.');
    }
  };

  const CalculatorContent = () => (
    <div className="space-y-4">
      {/* Abertura */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Abertura
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Preço Spot</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={aberturaSpot}
              onChange={(e) => setAberturaSpot(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Preço Short</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={aberturaShort}
              onChange={(e) => setAberturaShort(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div className={cn(
          "text-center py-2 px-3 rounded-md bg-accent/50 font-semibold text-sm",
          getColorClass(lucroEntrada)
        )}>
          {formatResult(lucroEntrada)}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Fechamento */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fechamento
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Preço Spot</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={fechamentoSpot}
              onChange={(e) => setFechamentoSpot(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Preço Short</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={fechamentoShort}
              onChange={(e) => setFechamentoShort(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div className={cn(
          "text-center py-2 px-3 rounded-md bg-accent/50 font-semibold text-sm",
          getColorClass(lucroFechamento)
        )}>
          {formatResult(lucroFechamento)}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Spread Final */}
      <div className="p-4 bg-gradient-to-br from-accent/60 to-accent/30 rounded-lg text-center border border-border/50">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Spread Final
        </Label>
        <div className={cn(
          "text-2xl font-bold mt-1",
          getColorClass(spreadFinal)
        )}>
          {formatResult(spreadFinal)}
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={limpar}
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Limpar
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={openFloatingWindow}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Flutuante
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Abrir em janela Picture-in-Picture (Chrome 116+)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          <Calculator className="w-4 h-4" />
          Calculadora
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculadora de Arbitragem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CalculatorContent />
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
