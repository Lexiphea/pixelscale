# PixelScale Backend

A FastAPI backend for an image hosting and editing platform, designed for AWS deployment.

## Development

```bash
# Install dependencies
uv sync

# Run the development server
uv run uvicorn src.app.main:app --reload

# Run with specific host/port
uv run uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## API Endpoints

- `GET /health` - Health check for load balancer
- `POST /api/upload` - Upload an image
- `GET /api/images` - List all images
- `GET /api/stress/{seconds}` - CPU stress test for auto-scaling demo
