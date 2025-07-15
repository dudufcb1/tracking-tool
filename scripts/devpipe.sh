#!/bin/bash

# Verificar si el servidor está corriendo
is_server_running() {
    if [ -f ".pid" ]; then
        pid=$(cat .pid)
        if ps -p $pid > /dev/null; then
            return 0
        fi
    fi
    return 1
}

# Iniciar el servidor
start_server() {
    if is_server_running; then
        echo "El servidor ya está corriendo"
        return 1
    fi

    echo "Iniciando servidor DevPipe..."
    source venv/bin/activate
    python server/main.py &
    echo $! > .pid
    echo "Servidor iniciado en http://localhost:7845"
}

# Detener el servidor
stop_server() {
    if [ -f ".pid" ]; then
        pid=$(cat .pid)
        if ps -p $pid > /dev/null; then
            kill $pid
            rm .pid
            echo "Servidor detenido"
        else
            echo "El servidor no está corriendo"
            rm .pid
        fi
    else
        echo "No se encontró archivo PID"
    fi
}

# Limpiar logs
clean_logs() {
    echo "Limpiando logs..."
    # TODO: Implementar limpieza de logs
}

# Mostrar estado
show_status() {
    if is_server_running; then
        echo "DevPipe está corriendo"
        pid=$(cat .pid)
        echo "PID: $pid"
    else
        echo "DevPipe no está corriendo"
    fi
}

# Comando principal
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    clean)
        clean_logs
        ;;
    status)
        show_status
        ;;
    *)
        echo "Uso: devpipe {start|stop|clean|status}"
        exit 1
esac
