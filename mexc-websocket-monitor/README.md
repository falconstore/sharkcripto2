# MEXC WebSocket Arbitrage Monitor

Monitor de arbitragem em tempo real para MEXC usando WebSocket.

## Requisitos

- Node.js 18+ 
- npm ou yarn

## Instalação

```bash
# Entrar na pasta
cd mexc-websocket-monitor

# Instalar dependências
npm install

# Copiar arquivo de configuração
copy .env.example .env

# Editar .env com suas credenciais
notepad .env
```

## Configuração (.env)

```env
# Supabase (obrigatório)
SUPABASE_URL=https://jschuymzkukzthesevoy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Configurações opcionais
MIN_VOLUME_24H=100000
SAVE_INTERVAL_MS=1000
```

### Onde encontrar a Service Role Key?

1. Acesse o painel do Lovable Cloud
2. Vá em Settings > Backend
3. Copie a Service Role Key

## Execução

### Modo desenvolvimento (com hot reload)
```bash
npm run dev
```

### Modo produção
```bash
# Compilar
npm run build

# Executar
npm start
```

## Executar como serviço no Windows

### Opção 1: PM2 (recomendado)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o monitor
pm2 start dist/index.js --name mexc-monitor

# Configurar para iniciar com Windows
pm2 startup
pm2 save
```

### Opção 2: NSSM (Windows Service)

1. Baixe NSSM: https://nssm.cc/download
2. Execute: `nssm install MexcMonitor`
3. Configure:
   - Path: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\caminho\para\mexc-websocket-monitor\dist\index.js`
   - Startup directory: `C:\caminho\para\mexc-websocket-monitor`

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Seu PC Windows                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Spot WS #1   │  │ Spot WS #2   │  │ Spot WS #N   │  │
│  │ (30 pares)   │  │ (30 pares)   │  │ (30 pares)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┼─────────────────┘           │
│                           ▼                             │
│                 ┌──────────────────┐                    │
│                 │ SpreadCalculator │                    │
│                 └────────┬─────────┘                    │
│                          │                              │
│         ┌────────────────┼────────────────┐             │
│         │                │                │             │
│         ▼                ▼                ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Futures WS#1 │  │ Futures WS#2 │  │ Supabase     │  │
│  │ (200 pares)  │  │ (200 pares)  │  │ Service      │  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │
│                                              │          │
└──────────────────────────────────────────────┼──────────┘
                                               │
                                               ▼
                                    ┌──────────────────┐
                                    │    Supabase DB   │
                                    │  (Lovable Cloud) │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   Frontend       │
                                    │  (Realtime)      │
                                    └──────────────────┘
```

## Logs

O monitor exibe em tempo real:
- Quantidade de pares Spot conectados
- Quantidade de pares Futures conectados
- Total de oportunidades encontradas
- Oportunidades com spread positivo
- Cruzamentos detectados

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY é obrigatório"
Verifique se o arquivo `.env` está configurado corretamente.

### "Erro ao conectar WebSocket"
- Verifique sua conexão com a internet
- A MEXC pode estar com instabilidade temporária

### Consumo de memória alto
- Reduza o número de pares monitorados
- Aumente o `SAVE_INTERVAL_MS` para reduzir operações de banco

## Performance

- Latência: ~50-200ms (tempo real)
- Conexões: 8-10 WebSockets simultâneos
- Memória: ~100-200MB
- CPU: <5% em idle
