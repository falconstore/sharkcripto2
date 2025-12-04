# 🦈 Shark Crypto Monitor - VPS Server

Monitor de arbitragem MEXC em tempo real usando WebSocket + Protocol Buffers.

## 📋 Requisitos

- Ubuntu 20.04+ ou Debian 11+
- Node.js 18+
- 1GB RAM mínimo
- Acesso à internet

## 🚀 Instalação Rápida

```bash
# 1. Clone ou copie os arquivos para a VPS
scp -r vps-server/* usuario@sua-vps:/tmp/shark-monitor/

# 2. Na VPS, execute:
cd /tmp/shark-monitor
sudo chmod +x install.sh
sudo ./install.sh

# 3. Configure as credenciais:
sudo nano /opt/shark-monitor/.env

# 4. Reinicie o serviço:
pm2 restart shark-monitor
```

## ⚙️ Configuração

Edite o arquivo `/opt/shark-monitor/.env`:

```env
# Supabase (OBRIGATÓRIO)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Configurações do Monitor
UPDATE_INTERVAL_MS=1000      # Intervalo de atualização (ms)
MIN_VOLUME_USDT=50000        # Volume mínimo para monitorar
CROSSING_THRESHOLD=0         # Threshold para registrar cruzamento

# Taxas
SPOT_TAKER_FEE=0.1           # Taxa spot (0.1%)
FUTURES_TAKER_FEE=0.02       # Taxa futures (0.02%)
```

## 📊 Comandos PM2

```bash
# Ver logs em tempo real
pm2 logs shark-monitor

# Ver status
pm2 status

# Reiniciar
pm2 restart shark-monitor

# Parar
pm2 stop shark-monitor

# Monitor interativo
pm2 monit

# Ver métricas
pm2 show shark-monitor
```

## 🔧 Estrutura do Projeto

```
/opt/shark-monitor/
├── server.js              # Servidor principal
├── package.json           # Dependências
├── .env                   # Configurações (criar manualmente)
├── websocket-proto/       # Arquivos Protocol Buffers
│   └── PushDataV3ApiWrapper.proto
└── logs/                  # Logs da aplicação
    └── app.log
```

## 📡 Como Funciona

1. **Conexão WebSocket Spot** (`wss://wbs-api.mexc.com/ws`)
   - Usa Protocol Buffers para dados comprimidos
   - Recebe order book em tempo real

2. **Conexão WebSocket Futures** (`wss://contract.mexc.com/edge`)
   - Dados JSON do order book de futuros
   - Inclui funding rate

3. **Cálculo de Arbitragem**
   - Spread de Entrada: (Futures Bid - Spot Ask) / Spot Ask
   - Spread de Saída: (Spot Bid - Futures Ask) / Futures Ask
   - Desconta taxas automaticamente

4. **Integração Supabase**
   - Atualiza tabela `arbitrage_opportunities`
   - Registra cruzamentos em `pair_crossings`

## 🐛 Troubleshooting

### Erro de conexão WebSocket
```bash
# Verificar se porta está bloqueada
sudo ufw status
sudo ufw allow out 443/tcp
```

### Erro de autenticação Supabase
```bash
# Verificar se a chave está correta
cat /opt/shark-monitor/.env
# A SERVICE_ROLE_KEY deve começar com "eyJ..."
```

### Alto uso de memória
```bash
# Verificar uso
pm2 show shark-monitor

# Reiniciar com limite de memória
pm2 delete shark-monitor
pm2 start server.js --name "shark-monitor" --max-memory-restart 500M
```

## 📈 Monitoramento

Para monitorar a saúde do servidor:

```bash
# CPU e Memória
htop

# Logs em tempo real
tail -f /opt/shark-monitor/logs/app.log

# Conexões de rede
ss -tuln | grep ESTABLISHED
```

## 🔄 Atualização

Para atualizar o servidor:

```bash
cd /opt/shark-monitor
pm2 stop shark-monitor

# Copie os novos arquivos
# ...

npm install
pm2 restart shark-monitor
```

## 📝 Licença

Uso interno - Shark Cripto
