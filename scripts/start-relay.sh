#!/bin/bash
set -e

export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH
export PATH=/home/reed/ollama/bin:$PATH
cd /home/reed/Projects/Ine-Discord

echo "=== Starting Ollama ==="
nohup ollama serve > /home/reed/ollama/ollama.log 2>&1 &
sleep 3

echo "=== Checking Ollama ==="
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is running"
else
    echo "✗ Ollama failed to start"
    exit 1
fi

echo "=== Starting Bot ==="
export OLLAMA_URL=http://localhost:11434
export OLLAMA_MODEL=bazobehram/qwen3-14b-claude-4.5-opus-high-reasoning
npm run start:relay
