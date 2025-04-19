# Creature Crafter Makefile

.PHONY: dev backend frontend install-deps

dev: install-deps
	@echo "Starting frontend only..."
	@cd frontend && npm run dev

backend:
	@echo "Starting backend services..."
	@npx concurrently \
		"cd backend/cmd/matchmaker && go run main.go" \
		"cd backend/cmd/oracle && go run main.go"

frontend:
	@echo "Starting frontend..."
	@cd frontend && npm run dev

install-deps:
	@echo "Checking dependencies..."
	@if [ ! -d "frontend/node_modules" ]; then \
		echo "Installing frontend dependencies..."; \
		cd frontend && npm install; \
	fi
