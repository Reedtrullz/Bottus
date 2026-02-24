#!/bin/bash
# Docker setup script for WSL2
# Run this once Docker Desktop is configured

set -e

echo "=== Docker Setup for WSL2 ==="

# Check if docker is available
if command -v docker &> /dev/null; then
    echo "✓ Docker is installed"
    docker --version
else
    echo "Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io docker-compose-v2
fi

# Check if docker service is running
if sudo service docker status &> /dev/null; then
    echo "✓ Docker service is running"
else
    echo "Starting Docker service..."
    sudo service docker start
fi

# Check if user is in docker group
if groups | grep -q docker; then
    echo "✓ User is in docker group"
else
    echo "Adding user to docker group..."
    sudo usermod -aG docker $USER
    echo "Please log out and back in for group changes to take effect"
fi

# Test docker
echo "Testing Docker..."
docker run hello-world

echo ""
echo "=== Setup Complete ==="
echo "Run 'docker compose up -d' to start your services"
