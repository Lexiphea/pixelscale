# PixelScale

A modern image upscaling application with a FastAPI backend and React frontend, deployable locally or on AWS.

## Project Structure

```
final_project/
├── backend/              # FastAPI backend
├── frontend/             # React + Vite frontend
├── docker-compose.yml    # Docker config (local development)
├── docker-compose.aws.yml # Docker config (AWS deployment)
├── deploy-aws.sh         # AWS deployment script
├── Makefile              # Make commands for development
├── dev.sh                # Shell script for development
└── package.json          # Root package.json for running both services
```

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.12
- **uv** (Python package manager) - [Install uv](https://github.com/astral-sh/uv)
- **Docker** (for containerized development/deployment)

---

## Running Locally

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

### Option 3: Shell Script

Best for: Simple bash execution with graceful shutdown.

```bash
./dev.sh
```

### Option 4: Docker Compose

Best for: Containerized development, consistent environments.

```bash
docker-compose up
```

Build fresh:

```bash
docker-compose up --build
```

### Local Service URLs

| Service  | URL                          |
|----------|------------------------------|
| Frontend | <http://localhost:5173>        |
| Backend  | <http://localhost:8000>        |
| API Docs | <http://localhost:8000/docs>   |

### Environment Variables (Local)

**Backend** (`backend/.env`):

```bash
cp backend/.env.example backend/.env
```

**Frontend** (`frontend/.env.local`):

```env
VITE_API_URL=http://localhost:8000
```

---

## AWS Deployment

### Prerequisites

- AWS EC2 instance with Docker installed
- RDS PostgreSQL database
- S3 buckets for raw/processed images
- Application Load Balancer (ALB) configured
- IAM role (LabRole) attached to EC2 with S3, RDS, CloudWatch access

### Environment Setup

Create `.env.aws` in the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@<rds-endpoint>:5432/<dbname>
S3_BUCKET_RAW=pixelscale-raw-<account-id>
S3_BUCKET_PROCESSED=pixelscale-processed-<account-id>
AWS_REGION=us-east-1
JWT_SECRET_KEY=<your-secret-key>
VITE_API_URL=http://<alb-dns-name>
```

### Quick Deploy

SSH into your EC2 instance and run:

```bash
cd /home/ec2-user/app
./deploy-aws.sh
```

### Manual Deploy

```bash
cd /home/ec2-user/app
sudo git pull
sudo docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d --build
```

### AWS Service URLs

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://<alb-dns>:3000        |
| Backend  | http://<alb-dns>             |
| API Docs | http://<alb-dns>/docs        |

### AWS Architecture

```
Internet → ALB → Auto Scaling Group (1-4 instances)
                      │
               EC2 Instance(s)
          ┌──────────┴──────────┐
          ▼                     ▼
   Frontend (nginx:80)   Backend (uvicorn:8000)
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              RDS PostgreSQL         S3 Buckets
```

### Security Groups

| Group | Ports | Purpose |
|-------|-------|---------|
| ALB | 80, 443, 3000 | Public HTTP/HTTPS + Frontend |
| EC2 | 80, 8000, 22 | Frontend, Backend API, SSH |
| RDS | 5432 | PostgreSQL (EC2 only) |

---

## License

MIT
