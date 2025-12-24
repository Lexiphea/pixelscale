# PixelScale Backend

FastAPI backend for image hosting and processing. Runs on **port 8000**.

## Quick Start

```bash
cd backend

# Install dependencies
uv sync

# Run server
uv run python main.py
```

Server runs at: **<http://localhost:8000>**

- API Docs: <http://localhost:8000/docs>
- All Endpoints: <http://localhost:8000/>

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all available endpoints |
| GET | `/health` | Health check (for load balancer) |
| GET | `/docs` | Interactive Swagger documentation |
| POST | `/api/upload` | Upload and process an image |
| POST | `/api/process/{id}` | Re-process existing image |
| GET | `/api/images` | List all processed images |
| GET | `/api/images/{id}` | Get single image details |
| GET | `/api/stress/{seconds}` | CPU stress test (for auto-scaling demo) |

---

## Examples

### Upload an Image

```bash
# Basic upload (resizes to medium 800x800)
curl -X POST -F "file=@/path/to/image.jpg" http://localhost:8000/api/upload

# With custom size
curl -X POST -F "file=@/path/to/image.jpg" \
  "http://localhost:8000/api/upload?width=500&height=500"

# With preset size
curl -X POST -F "file=@/path/to/image.jpg" \
  "http://localhost:8000/api/upload?preset=thumbnail"
```

### Upload with Filters & Adjustments

```bash
# Grayscale filter
curl -X POST -F "file=@/path/to/image.jpg" \
  "http://localhost:8000/api/upload?filter=grayscale"

# Sepia + brightness boost
curl -X POST -F "file=@/path/to/image.jpg" \
  "http://localhost:8000/api/upload?filter=sepia&brightness=20"

# Rotate 90° + flip horizontal
curl -X POST -F "file=@/path/to/image.jpg" \
  "http://localhost:8000/api/upload?rotate=90&flip_horizontal=true"

# Output as PNG with high quality
curl -X POST -F "file=@/path/to/image.jpg" \
  "http://localhost:8000/api/upload?format=png&quality=95"
```

### Get Gallery

```bash
curl http://localhost:8000/api/images
```

Response:

```json
[
  {
    "id": 1,
    "filename": "dog.jpg",
    "url": "/uploads/processed/medium/abc123.jpg",
    "uploaded_at": "2025-12-24T11:30:00"
  }
]
```

### Re-process Existing Image

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"filter": "blur", "brightness": -10, "preset": "thumbnail"}' \
  http://localhost:8000/api/process/1
```

### Health Check

```bash
curl http://localhost:8000/health
# {"status": "healthy"}
```

---

## Processing Options

| Category | Options |
|----------|---------|
| **Resize** | `width`, `height`, `preset` (thumbnail/medium/large), `maintain_aspect` |
| **Crop** | `crop_x`, `crop_y`, `crop_width`, `crop_height` |
| **Transform** | `rotate` (0-360°), `flip_horizontal`, `flip_vertical` |
| **Filters** | `none`, `grayscale`, `sepia`, `blur`, `sharpen`, `contour`, `emboss` |
| **Adjustments** | `brightness`, `contrast`, `saturation` (-100 to 100) |
| **Output** | `format` (jpeg/png/webp), `quality` (1-100) |

### Preset Sizes

| Preset | Dimensions |
|--------|------------|
| `thumbnail` | 150 × 150 |
| `medium` | 800 × 800 |
| `large` | 1920 × 1920 |

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./pixelscale.db` | Database connection |
| `USE_LOCAL_STORAGE` | `true` | Use local filesystem instead of S3 |
| `LOCAL_STORAGE_PATH` | `./uploads` | Where to store images locally |
| `S3_BUCKET_RAW` | `pixelscale-raw` | S3 bucket for raw uploads |
| `S3_BUCKET_PROCESSED` | `pixelscale-processed` | S3 bucket for processed images |
| `AWS_REGION` | `us-east-1` | AWS region |

---

## Docker

```bash
# Build
docker build -t pixelscale-backend .

# Run
docker run -p 8000:8000 pixelscale-backend
```
