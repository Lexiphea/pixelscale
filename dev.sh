#!/bin/bash

# PixelScale Development Script
# Runs both backend and frontend concurrently

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting PixelScale development servers..."
echo ""

# Start backend
echo "📦 Starting backend on http://localhost:8000"
cd "$PROJECT_ROOT/backend" && uv run python main.py &
BACKEND_PID=$!

# Give backend a moment to start
sleep 1

# Start frontend
echo "🎨 Starting frontend on http://localhost:5173"
cd "$PROJECT_ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
