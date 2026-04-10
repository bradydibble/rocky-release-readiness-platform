.PHONY: dev build up down logs backend frontend db-shell migrate

dev:
	docker compose up

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

backend:
	docker compose up backend db

frontend:
	cd frontend && npm run dev

db-shell:
	docker compose exec db psql -U r3p -d r3p

migrate:
	docker compose exec backend alembic upgrade head

migrate-new:
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

# Production build
build-prod:
	cd frontend && npm run build
	docker build -t r3p-backend ./backend
	docker build -t r3p-frontend ./frontend

lint-backend:
	cd backend && python -m ruff check app/

test-backend:
	cd backend && python -m pytest
