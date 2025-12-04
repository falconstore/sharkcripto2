#!/bin/bash

# ==============================================
# Shark Crypto Monitor - Installation Script
# ==============================================

set -e

echo "🦈 Shark Crypto Monitor - Instalação"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Por favor, execute como root (sudo)${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}Atualizando sistema...${NC}"
apt-get update -y
apt-get upgrade -y

# Install Node.js 20.x if not installed
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Instalando Node.js 20.x...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo -e "${GREEN}Node.js já instalado: $(node -v)${NC}"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}Instalando PM2...${NC}"
  npm install -g pm2
else
  echo -e "${GREEN}PM2 já instalado${NC}"
fi

# Create application directory
APP_DIR="/opt/shark-monitor"
echo -e "${YELLOW}Criando diretório: $APP_DIR${NC}"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/websocket-proto

# Copy files
echo -e "${YELLOW}Copiando arquivos...${NC}"
cp package.json $APP_DIR/
cp server.js $APP_DIR/
cp websocket-proto/*.proto $APP_DIR/websocket-proto/

# Check if .env exists
if [ ! -f "$APP_DIR/.env" ]; then
  if [ -f ".env" ]; then
    cp .env $APP_DIR/
    echo -e "${GREEN}.env copiado${NC}"
  else
    cp .env.example $APP_DIR/.env
    echo -e "${YELLOW}⚠️  Criado .env de exemplo. Configure suas credenciais!${NC}"
    echo -e "${YELLOW}   Edite: $APP_DIR/.env${NC}"
  fi
fi

# Install dependencies
echo -e "${YELLOW}Instalando dependências...${NC}"
cd $APP_DIR
npm install --production

# Setup PM2
echo -e "${YELLOW}Configurando PM2...${NC}"
pm2 delete shark-monitor 2>/dev/null || true
pm2 start server.js --name "shark-monitor" --log $APP_DIR/logs/app.log
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}======================================"
echo -e "✅ Instalação concluída!"
echo -e "======================================${NC}"
echo ""
echo "📁 Diretório: $APP_DIR"
echo ""
echo "Comandos úteis:"
echo "  pm2 logs shark-monitor    # Ver logs"
echo "  pm2 restart shark-monitor # Reiniciar"
echo "  pm2 stop shark-monitor    # Parar"
echo "  pm2 monit                 # Monitor interativo"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Configure o .env antes de iniciar!${NC}"
echo "   nano $APP_DIR/.env"
echo ""
