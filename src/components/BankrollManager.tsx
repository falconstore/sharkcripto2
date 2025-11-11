import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, TrendingUp, DollarSign, Target, 
  Plus, Minus, Trash2, BarChart3 
} from 'lucide-react';
import { useBankroll } from '@/hooks/useBankroll';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

interface BankrollManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BankrollManager = ({ open, onOpenChange }: BankrollManagerProps) => {
  const { config, operations, stats, saveConfig, addOperation, deleteOperation, isLoadingConfig } = useBankroll();
  const [initialBalance, setInitialBalance] = useState(config?.initial_balance_usdt?.toString() || '1000');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const handleSaveConfig = () => {
    const value = parseFloat(initialBalance);
    if (isNaN(value) || value <= 0) {
      return;
    }
    saveConfig(value);
  };

  const handleDeposit = () => {
    const value = parseFloat(depositAmount);
    if (isNaN(value) || value <= 0) {
      return;
    }
    addOperation({
      operation_type: 'deposit',
      amount_usdt: value,
      notes: 'Depósito'
    });
    setDepositAmount('');
  };

  const handleWithdraw = () => {
    const value = parseFloat(withdrawAmount);
    if (isNaN(value) || value <= 0) {
      return;
    }
    addOperation({
      operation_type: 'withdrawal',
      amount_usdt: value,
      notes: 'Saque'
    });
    setWithdrawAmount('');
  };

  // Preparar dados para gráfico de evolução
  const balanceEvolution = operations
    .slice()
    .reverse()
    .reduce((acc, op, index) => {
      const prevBalance = index === 0 ? (config?.initial_balance_usdt || 0) : acc[index - 1].balance;
      let newBalance = prevBalance;
      
      if (op.operation_type === 'trade') {
        newBalance += op.profit_usdt || 0;
      } else if (op.operation_type === 'deposit') {
        newBalance += op.amount_usdt;
      } else if (op.operation_type === 'withdrawal') {
        newBalance -= op.amount_usdt;
      }

      acc.push({
        date: format(new Date(op.operation_date), 'dd/MM'),
        balance: newBalance
      });
      return acc;
    }, [] as { date: string; balance: number }[]);

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Ganhos', value: stats.winningTrades, color: 'hsl(var(--profit))' },
    { name: 'Perdas', value: stats.totalTrades - stats.winningTrades, color: 'hsl(var(--destructive))' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gold" />
            Gerenciador de Banca
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gold">
                    ${stats.currentBalance.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-profit' : 'text-destructive'}`}>
                    ${stats.totalProfit.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    R$ {stats.totalProfitBRL.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ROI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-profit' : 'text-destructive'}`}>
                    {stats.roi.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalTrades > 0 
                      ? ((stats.winningTrades / stats.totalTrades) * 100).toFixed(0)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.winningTrades}/{stats.totalTrades} trades
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Evolução do Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={balanceEvolution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="balance" stroke="hsl(var(--gold))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuição de Trades</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {stats.totalTrades > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      Nenhum trade registrado
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history" className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {operations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma operação registrada
                </div>
              ) : (
                <div className="space-y-2">
                  {operations.map((op) => (
                    <Card key={op.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            op.operation_type === 'trade' 
                              ? 'bg-gold/10' 
                              : op.operation_type === 'deposit'
                              ? 'bg-profit/10'
                              : 'bg-destructive/10'
                          }`}>
                            {op.operation_type === 'trade' && <BarChart3 className="w-4 h-4 text-gold" />}
                            {op.operation_type === 'deposit' && <Plus className="w-4 h-4 text-profit" />}
                            {op.operation_type === 'withdrawal' && <Minus className="w-4 h-4 text-destructive" />}
                          </div>
                          
                          <div>
                            <div className="font-semibold">
                              {op.operation_type === 'trade' && `Trade - ${op.pair_symbol}`}
                              {op.operation_type === 'deposit' && 'Depósito'}
                              {op.operation_type === 'withdrawal' && 'Saque'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(op.operation_date), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {op.operation_type === 'trade' && (
                              <div className={`font-bold ${(op.profit_usdt || 0) >= 0 ? 'text-profit' : 'text-destructive'}`}>
                                {(op.profit_usdt || 0) >= 0 ? '+' : ''}${(op.profit_usdt || 0).toFixed(2)}
                              </div>
                            )}
                            {op.operation_type === 'deposit' && (
                              <div className="font-bold text-profit">
                                +${op.amount_usdt.toFixed(2)}
                              </div>
                            )}
                            {op.operation_type === 'withdrawal' && (
                              <div className="font-bold text-destructive">
                                -${op.amount_usdt.toFixed(2)}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteOperation(op.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Configuração */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Saldo Inicial</CardTitle>
                <CardDescription>
                  Configure o valor inicial da sua banca em USDT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="initial-balance">Valor Inicial (USDT)</Label>
                  <Input
                    id="initial-balance"
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="1000"
                  />
                </div>
                <Button onClick={handleSaveConfig} disabled={isLoadingConfig}>
                  <Target className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Depositar</CardTitle>
                  <CardDescription>Adicionar fundos à banca</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Valor (USDT)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <Button onClick={handleDeposit} className="w-full bg-profit hover:bg-profit/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Depositar
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sacar</CardTitle>
                  <CardDescription>Retirar fundos da banca</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Valor (USDT)</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <Button onClick={handleWithdraw} variant="destructive" className="w-full">
                    <Minus className="w-4 h-4 mr-2" />
                    Sacar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BankrollManager;
