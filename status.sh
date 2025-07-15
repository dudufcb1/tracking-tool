#!/bin/bash

# Script para verificar el estado del servidor DevPipe
# Uso: ./status.sh

PORT=7845
URL="http://localhost:$PORT"

echo "🔍 Verificando estado del servidor DevPipe..."
echo ""

# Verificar si el puerto está en uso
echo "📊 Estado del puerto $PORT:"
PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ -z "$PIDS" ]; then
    echo "❌ Puerto $PORT no está en uso"
    echo ""
    echo "💡 Para iniciar el servidor:"
    echo "   ./start.sh"
    exit 1
else
    echo "✅ Puerto $PORT en uso por procesos: $PIDS"
    echo ""
    
    # Mostrar detalles de los procesos
    echo "🔧 Detalles de procesos:"
    echo "$PIDS" | while read pid; do
        if [ ! -z "$pid" ]; then
            ps aux | grep "^[^ ]* *$pid " | grep -v grep
        fi
    done
fi

echo ""

# Verificar conectividad HTTP
echo "🌐 Verificando conectividad HTTP..."
if curl -s --connect-timeout 5 "$URL" > /dev/null; then
    echo "✅ Servidor respondiendo en $URL"
    
    # Obtener información del servidor
    echo ""
    echo "📋 Información del servidor:"
    curl -s "$URL" | python3 -m json.tool 2>/dev/null || echo "❌ Error al parsear respuesta JSON"
    
    echo ""
    echo "🔗 Enlaces útiles:"
    echo "   🏠 Inicio: $URL"
    echo "   ⚙️  Admin: $URL/admin/"
    echo "   📝 Docs: $URL/docs/js"
    echo "   🧪 Demo: $URL/examples/simple-demo.html"
    echo "   📦 Script: $URL/client/devpipe.js"
    
else
    echo "❌ Servidor no responde en $URL"
    echo ""
    echo "💡 Posibles soluciones:"
    echo "   1. Verificar que el servidor esté iniciado: ./start.sh"
    echo "   2. Verificar logs del servidor"
    echo "   3. Verificar puertos: netstat -tlnp | grep $PORT"
    exit 1
fi

echo ""
echo "✨ DevPipe está funcionando correctamente!"
