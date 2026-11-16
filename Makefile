# Developer entry points. Run `make help` for the list.
BACKEND := backend
FRONTEND := frontend
VENV := $(BACKEND)/.venv
PY := $(VENV)/bin/python

.DEFAULT_GOAL := help
.PHONY: help setup setup-backend setup-frontend dev-backend dev-frontend serve lint format typecheck test test-backend test-frontend e2e api-types build check

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

setup: setup-backend setup-frontend ## Install backend and frontend dependencies

setup-backend: ## Create the backend virtualenv and install it with dev tools
	scripts/make-venv.sh $(VENV)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -e "$(BACKEND)[dev]"

setup-frontend: ## Install frontend dependencies
	cd $(FRONTEND) && npm ci

dev-backend: ## Run the API with auto-reload on http://127.0.0.1:8000
	cd $(BACKEND) && .venv/bin/uvicorn pyanalyzer.main:app --reload --host 127.0.0.1 --port 8000

dev-frontend: ## Run the Vite dev server
	cd $(FRONTEND) && npm run dev

serve: build ## Build the frontend and run the whole app on http://localhost:8000
	cd $(BACKEND) && .venv/bin/pyanalyzer serve

lint: ## Lint and format-check backend and frontend
	cd $(BACKEND) && .venv/bin/ruff check . && .venv/bin/ruff format --check .
	cd $(FRONTEND) && npm run lint && npm run format:check && npm run unused

format: ## Auto-format backend and frontend
	cd $(BACKEND) && .venv/bin/ruff check --fix . && .venv/bin/ruff format .
	cd $(FRONTEND) && npm run format

typecheck: ## Type-check backend and frontend
	cd $(BACKEND) && .venv/bin/mypy
	cd $(FRONTEND) && npm run type-check

test-backend: ## Run backend tests with coverage
	cd $(BACKEND) && .venv/bin/python -m pytest --cov -m "not slow"

test-frontend: ## Run frontend unit tests with coverage
	cd $(FRONTEND) && npm run test:coverage

e2e: build ## Run browser tests against the real backend
	cd $(FRONTEND) && npm run e2e

api-types: ## Regenerate frontend API types from the backend
	cd $(BACKEND) && .venv/bin/python scripts/export_openapi.py ../$(FRONTEND)/openapi.json
	cd $(FRONTEND) && npm run gen:api

test: test-backend test-frontend ## Run all tests

build: ## Build the frontend for production
	cd $(FRONTEND) && npm run build

check: lint typecheck test ## Everything CI runs
