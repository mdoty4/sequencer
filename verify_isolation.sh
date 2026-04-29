#!/bin/zsh

PORT=4322

echo "Starting server..."
node index.js & 
SERVER_PID=$!
sleep 3

# Function to cleanup on exit
cleanup() {
  kill $SERVER_PID 2>/dev/null
}
trap cleanup EXIT

echo "Creating Project A..."
PROJ_A_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/projects -H "Content-Type: application/json" -d '{"name": "Project A"}')
echo "Raw Response A: $PROJ_A_RESPONSE"
PROJ_A_ID=$(echo $PROJ_A_RESPONSE | jq -r '.project.id' 2>/dev/null)
echo "Project A ID: $PROJ_A_ID"

echo "Adding requirements to Project A..."
curl -s -X POST http://localhost:$PORT/api/project/$PROJ_A_ID/tasks -H "Content-Type: application/json" -d '{"tasks": ["Req A1", "Req A2"]}'

echo "Creating Project B..."
PROJ_B_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/projects -H "Content-Type: application/json" -d '{"name": "Project B"}')
echo "Raw Response B: $PROJ_B_RESPONSE"
PROJ_B_ID=$(echo $PROJ_B_RESPONSE | jq -r '.project.id' 2>/dev/null)
echo "Project B ID: $PROJ_B_ID"

echo "Adding requirements to Project B..."
curl -s -X POST http://localhost:$PORT/api/project/$PROJ_B_ID/tasks -H "Content-Type: application/json" -d '{"tasks": ["Req B1", "Req B2", "Req B3"]}'

echo "\n--- Verification ---"
echo "Verifying Project A Tasks:"
curl -s http://localhost:$PORT/api/project/$PROJ_A_ID/tasks | jq .

echo "\nVerifying Project B Tasks:"
curl -s http://localhost:$PORT/api/project/$PROJ_B_ID/tasks | jq .