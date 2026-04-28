# CricketStream — Developer Commands
# Usage: make <command>

.PHONY: help setup dev docker-up docker-down docker-logs \
        backend frontend install-backend install-frontend \
        test-api test-commentary test-tts clean

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  CricketStream Commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make setup          — first-time setup (copies .env files)"
	@echo "  make docker-up      — start everything with Docker"
	@echo "  make docker-down    — stop all containers"
	@echo "  make docker-logs    — tail all container logs"
	@echo "  make dev            — run backend + frontend without Docker"
	@echo "  make backend        — run backend only"
	@echo "  make frontend       — run frontend only"
	@echo "  make test-api       — test all API endpoints"
	@echo "  make test-commentary — test commentary generation"
	@echo "  make test-tts       — test TTS synthesis"
	@echo "  make clean          — remove build artifacts"
	@echo ""

# ── First-time setup ──────────────────────────────────────────────────────────
setup:
	@echo "Setting up CricketStream..."
	@[ -f backend/.env ] || (cp backend/.env.example backend/.env && echo "  Created backend/.env — add your API keys")
	@[ -f frontend/.env.local ] || (cp frontend/.env.example frontend/.env.local && echo "  Created frontend/.env.local")
	@echo "Setup complete. Edit backend/.env to add API keys."

# ── Docker ────────────────────────────────────────────────────────────────────
docker-up: setup
	docker compose up --build -d
	@echo ""
	@echo "  Services started:"
	@echo "  Frontend  →  http://localhost:3000"
	@echo "  Backend   →  http://localhost:8000"
	@echo "  API Docs  →  http://localhost:8000/docs"
	@echo "  Health    →  http://localhost:8000/api/health"

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-restart:
	docker compose restart backend

# ── Local dev (no Docker) ─────────────────────────────────────────────────────
install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

backend:
	cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting Redis..."
	@redis-server --daemonize yes --maxmemory 128mb 2>/dev/null || true
	@echo "Starting backend (background)..."
	@cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
	@sleep 2
	@echo "Starting frontend..."
	@cd frontend && npm run dev

# ── Testing ───────────────────────────────────────────────────────────────────
test-api:
	@echo "Testing health..."
	@curl -s http://localhost:8000/api/health | python3 -m json.tool
	@echo "\nTesting source status..."
	@curl -s http://localhost:8000/api/source-status | python3 -m json.tool
	@echo "\nTesting matches..."
	@curl -s http://localhost:8000/api/matches | python3 -m json.tool

test-commentary:
	@echo "Testing SIX commentary..."
	@curl -s http://localhost:8000/commentary/test/6 | python3 -m json.tool
	@echo "\nTesting WICKET commentary..."
	@curl -s http://localhost:8000/commentary/test/W | python3 -m json.tool

test-tts:
	@echo "Testing TTS health..."
	@curl -s http://localhost:8000/tts/health | python3 -m json.tool
	@echo "\nTesting voice list..."
	@curl -s http://localhost:8000/tts/voices | python3 -m json.tool
	@echo "\nTesting synthesis..."
	@curl -s -X POST http://localhost:8000/tts/synthesize \
		-H "Content-Type: application/json" \
		-d '{"text":"SIX! Kohli launches it over the boundary!","voice":"am_adam"}' \
		| python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Audio bytes: {d.get(\"bytes\",\"ERROR\")}')"

test-commentary-health:
	@curl -s http://localhost:8000/commentary/health | python3 -m json.tool

# ── Build ─────────────────────────────────────────────────────────────────────
build-frontend:
	cd frontend && npm run build
	@echo "Frontend built → frontend/dist/"

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	rm -rf frontend/dist frontend/node_modules
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -name "*.pyc" -delete 2>/dev/null || true
	@echo "Cleaned build artifacts"
