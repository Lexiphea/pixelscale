#!/bin/bash

# PixelScale AWS Deployment Script
# Run this on your EC2 instance to deploy/update the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_DIR="/home/ec2-user/app"
COMPOSE_FILE="docker-compose.aws.yml"
ENV_FILE=".env.aws"

echo -e "${GREEN}PixelScale AWS Deployment${NC}"
echo ""

# Check if we're in the right directory
cd "$APP_DIR" || { echo -e "${RED}ERROR: Failed to cd to $APP_DIR${NC}"; exit 1; }

# Check if .env.aws exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}WARNING: $ENV_FILE not found. Creating from example...${NC}"
    if [ -f ".env.aws.example" ]; then
        cp .env.aws.example "$ENV_FILE"
        echo -e "${YELLOW}WARNING: Please edit $ENV_FILE with your actual values!${NC}"
    else
        echo -e "${RED}ERROR: .env.aws.example not found. Please create $ENV_FILE manually.${NC}"
        exit 1
    fi
fi

# Pull latest code
echo -e "${GREEN}Pulling latest code...${NC}"
sudo git pull

# Stop and remove old containers
echo -e "${YELLOW}Stopping old containers...${NC}"
sudo docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true
sudo docker stop pixelscale-backend pixelscale-frontend 2>/dev/null || true
sudo docker rm pixelscale-backend pixelscale-frontend 2>/dev/null || true

# Build and start new containers
echo -e "${GREEN}Building and starting containers...${NC}"
sudo docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# Wait a moment for containers to start
sleep 3

# Check status
echo ""
echo -e "${GREEN}Container Status:${NC}"
sudo docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

# Clean up old images (optional)
echo ""
echo -e "${YELLOW}Cleaning up unused Docker resources...${NC}"
sudo docker system prune -f

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Frontend: http://pixelscale-alb-2131670913.us-east-1.elb.amazonaws.com:3000"
echo "Backend:  http://pixelscale-alb-2131670913.us-east-1.elb.amazonaws.com"
echo ""
echo "To view logs: sudo docker-compose -f $COMPOSE_FILE logs -f"
