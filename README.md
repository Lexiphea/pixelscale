# PixelScale

A modern image upscaling application with a FastAPI backend and React frontend.

## Project Structure

```
final_project/
├── backend/          # FastAPI backend
├── frontend/         # React + Vite frontend
├── package.json      # Root package.json for running both services
├── Makefile          # Make commands for development
├── dev.sh            # Shell script for development
└── docker-compose.yml  # Docker configuration
```

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.12
- **uv** (Python package manager) - [Install uv](https://github.com/astral-sh/uv)
- **Docker** (optional, for containerized development)

## Quick Start

### Install Dependencies

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd backend && uv sync
```

Or use the Makefile:

```bash
make install
```

---

## Running the Application

You have **4 options** to run both frontend and backend together:

### Option 1: npm + concurrently (Recommended)

Best for: Single terminal, color-coded output, easy to stop both with Ctrl+C.

```bash
# First time only - install concurrently
npm install

# Run both services
npm run dev
```

Individual commands:

```bash
npm run backend   # Backend only
npm run frontend  # Frontend only
```

---

### Option 2: Makefile

Best for: Unix users who prefer make commands.

```bash
# Run both services
make dev

# Run individually
make backend
make frontend

# Other commands
make install  # Install all dependencies
make build    # Build frontend for production
make clean    # Clean build artifacts
```

---

### Option 3: Shell Script

Best for: Simple bash execution with graceful shutdown.

```bash
./dev.sh
```

---

### Option 4: Docker Compose

Best for: Containerized development, consistent environments.

```bash
docker-compose up
```

Build fresh:

```bash
docker-compose up --build
```

---

## Service URLs

| Service  | URL                    |
|----------|------------------------|
| Frontend | <http://localhost:5173>  |
| Backend  | <http://localhost:8000>  |
| API Docs | <http://localhost:8000/docs> |

## Environment Variables

### Backend (`backend/.env`)

Copy the example file and configure:

```bash
cp backend/.env.example backend/.env
```

### Frontend

The frontend uses Vite environment variables. Create `frontend/.env.local` if needed:

```env
VITE_API_URL=http://localhost:8000
```

## Development

### Backend

```bash
cd backend
uv run python main.py
```

### Frontend

```bash
cd frontend
npm run dev
```

## Build for Production

```bash
# Build frontend
cd frontend && npm run build

# The built files will be in frontend/dist/
```

## License

MIT
