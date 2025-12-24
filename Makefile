.PHONY: dev backend frontend install build clean

# Run both backend and frontend concurrently
dev:
	@echo "Starting backend and frontend..."
	@cd backend && uv run python main.py & \
	cd frontend && npm run dev

# Run only the backend
backend:
	cd backend && uv run python main.py

# Run only the frontend
frontend:
	cd frontend && npm run dev

# Install all dependencies
install:
	cd backend && uv sync
	cd frontend && npm install

# Build frontend for production
build:
	cd frontend && npm run build

# Clean build artifacts
clean:
	rm -rf frontend/dist
	rm -rf backend/__pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
