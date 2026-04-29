#!/bin/zsh
node index.js &
SERVER_PID=$!
sleep 3
echo "Testing GET /api/prompts..."
curl -s http://localhost:4322/api/prompts
echo "\nTesting POST /api/prompts..."
curl -s -X POST -H "Content-Type: application/json" -d '{"prompts": ["Test Prompt 1", "Test Prompt 2"]}' http://localhost:4322/api/prompts
echo "\nTesting POST /api/project/new..."
curl -s -X POST http://localhost:4322/api/project/new
kill $SERVER_PID