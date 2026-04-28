#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# CricketStream — One-Command Setup Script
# Works on: Termux (Android), Ubuntu/Debian, macOS
# ─────────────────────────────────────────────────────────────────────────────

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ██████╗██████╗ ██╗ ██████╗██╗  ██╗███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗"
echo "  ██╔════╝██╔══██╗██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║"
echo "  ██║     ██████╔╝██║██║     █████╔╝ █████╗     ██║   ██████╔╝█████╗  ███████║██╔████╔██║"
echo "  ██║     ██╔══██╗██║██║     ██╔═██╗ ██╔══╝     ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║"
echo "  ╚██████╗██║  ██║██║╚██████╗██║  ██╗███████╗   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║"
echo "   ╚═════╝╚═╝  ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝"
echo -e "${NC}"
echo -e "${CYAN}  Real-Time AI Cricket Commentary Platform${NC}"
echo ""

# ── Detect environment ────────────────────────────────────────────────────────
IS_TERMUX=false
if [ -d "/data/data/com.termux" ]; then
  IS_TERMUX=true
  echo -e "${YELLOW}📱 Termux detected — using Termux-compatible setup${NC}"
else
  echo -e "${GREEN}🖥  Linux/macOS detected${NC}"
fi

echo ""
echo -e "${CYAN}Choose setup mode:${NC}"
echo "  1) Full Docker setup (recommended for PC/server)"
echo "  2) Manual setup (recommended for Termux/Android)"
echo "  3) Quick demo only (no backend — frontend mock data)"
echo ""
read -p "Enter choice [1/2/3]: " CHOICE

# ─────────────────────────────────────────────────────────────────────────────
if [ "$CHOICE" = "1" ]; then
  echo -e "\n${GREEN}🐳 Docker Setup${NC}"

  # Check Docker
  if ! command -v docker &>/dev/null; then
    echo -e "${RED}Docker not found. Install from https://docs.docker.com/get-docker/${NC}"
    exit 1
  fi

  # Copy env files
  [ ! -f backend/.env ] && cp backend/.env.example backend/.env && echo -e "${YELLOW}⚠  Created backend/.env — edit it to add API keys${NC}"
  [ ! -f frontend/.env.local ] && cp frontend/.env.example frontend/.env.local

  echo -e "\n${GREEN}Starting all services...${NC}"
  docker compose up --build -d

  echo -e "\n${GREEN}✅ All services started!${NC}"
  echo -e "  🌐 Frontend:  ${CYAN}http://localhost:3000${NC}"
  echo -e "  ⚡ Backend:   ${CYAN}http://localhost:8000${NC}"
  echo -e "  📖 API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
  echo -e "  🔴 Redis:     ${CYAN}localhost:6379${NC}"
  echo -e "  🎙  Kokoro:    ${CYAN}http://localhost:8880${NC}"

# ─────────────────────────────────────────────────────────────────────────────
elif [ "$CHOICE" = "2" ]; then
  echo -e "\n${GREEN}🔧 Manual Setup${NC}"

  # Copy env
  [ ! -f backend/.env ] && cp backend/.env.example backend/.env && echo -e "${YELLOW}⚠  Created backend/.env — edit it to add API keys${NC}"

  # Install Python deps
  echo -e "\n${CYAN}Installing Python dependencies...${NC}"
  cd backend
  if $IS_TERMUX; then
    pip install -r requirements.txt
  else
    pip3 install -r requirements.txt
  fi
  cd ..

  # Install Node deps
  echo -e "\n${CYAN}Installing frontend dependencies...${NC}"
  cd frontend && npm install && cd ..

  # Start Redis
  echo -e "\n${CYAN}Starting Redis...${NC}"
  if $IS_TERMUX; then
    redis-server --daemonize yes --maxmemory 128mb
  elif command -v systemctl &>/dev/null; then
    sudo systemctl start redis || redis-server --daemonize yes
  else
    redis-server --daemonize yes
  fi
  echo -e "${GREEN}✅ Redis started${NC}"

  # Instructions for Kokoro
  echo -e "\n${YELLOW}⚠  Kokoro TTS requires Docker or a separate server.${NC}"
  echo -e "   Termux option: Set TTS_PROVIDER=elevenlabs in backend/.env"
  echo -e "   and add your free ElevenLabs API key."
  echo -e "   Or: set LLM_PROVIDER=groq with free Groq key for text-only mode.\n"

  # Start backend
  echo -e "${CYAN}Starting backend...${NC}"
  cd backend
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
  BACKEND_PID=$!
  cd ..
  echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

  # Start frontend
  echo -e "\n${CYAN}Starting frontend...${NC}"
  cd frontend
  npm run dev -- --host 0.0.0.0 &
  FRONTEND_PID=$!
  cd ..
  echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

  echo -e "\n${GREEN}✅ All services started!${NC}"
  echo -e "  🌐 Frontend:  ${CYAN}http://localhost:3000${NC}"
  echo -e "  ⚡ Backend:   ${CYAN}http://localhost:8000${NC}"
  echo -e "  📖 API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
  echo -e "\n  To stop: kill $BACKEND_PID $FRONTEND_PID && redis-cli shutdown"

# ─────────────────────────────────────────────────────────────────────────────
elif [ "$CHOICE" = "3" ]; then
  echo -e "\n${CYAN}Quick Demo Mode (frontend only)${NC}"
  [ ! -f frontend/.env.local ] && cp frontend/.env.example frontend/.env.local
  cd frontend && npm install && npm run dev -- --host 0.0.0.0
fi
