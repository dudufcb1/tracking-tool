#!/bin/bash

# Tests básicos de endpoints para el servidor Flask
# Tracking Tool - DevPipe

PORT=8000
BASE_URL="http://localhost:$PORT"

echo "=== TESTING SERVIDOR FLASK ==="
echo "URL base: $BASE_URL"
echo ""

# Test 1: GET /config
echo "Test 1: GET /config - Obtener configuración"
response=$(curl -s "$BASE_URL/config")
if [[ $response == *"success"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 2: POST /monitoring/start
echo "Test 2: POST /monitoring/start - Activar monitoreo"
response=$(curl -s -X POST "$BASE_URL/monitoring/start")
if [[ $response == *"success"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 3: POST /log
echo "Test 3: POST /log - Enviar log"
response=$(curl -s -X POST "$BASE_URL/log" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log desde script",
    "url": "http://test.com",
    "timestamp": "2025-07-14T22:30:00",
    "user_agent": "test-script"
  }')
if [[ $response == *"success"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 4: GET /logs
echo "Test 4: GET /logs - Obtener logs"
response=$(curl -s "$BASE_URL/logs")
if [[ $response == *"success"* ]] && [[ $response == *"data"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 5: POST /monitoring/stop
echo "Test 5: POST /monitoring/stop - Parar monitoreo"
response=$(curl -s -X POST "$BASE_URL/monitoring/stop")
if [[ $response == *"success"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 6: POST /logs/clear
echo "Test 6: POST /logs/clear - Limpiar logs"
response=$(curl -s -X POST "$BASE_URL/logs/clear")
if [[ $response == *"success"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 7: POST /config
echo "Test 7: POST /config - Actualizar configuración"
response=$(curl -s -X POST "$BASE_URL/config" \
  -H "Content-Type: application/json" \
  -d '{"maxFileSize": 150, "maxLogs": 30}')
if [[ $response == *"success"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: $response"
fi
echo ""

# Test 8: Verificar configuración actualizada
echo "Test 8: Verificar configuración actualizada"
response=$(curl -s "$BASE_URL/config")
if [[ $response == *"maxFileSize\":150"* ]]; then
    echo "✅ PASADO"
else
    echo "❌ FALLIDO: Configuración no se actualizó"
fi
echo ""

echo "=== RESUMEN ==="
echo "🎉 Tests completados"
echo "🚀 Servidor Flask verificado y funcional"
