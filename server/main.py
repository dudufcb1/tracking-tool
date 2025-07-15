from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import signal
import socket
import subprocess
import sys
from datetime import datetime

from core.log_manager import LogManager
from core.config_manager import ConfigManager
from core.file_watcher import FileWatcher

def kill_process_on_port(port):
    """
    Mata cualquier proceso que esté usando el puerto especificado.

    Args:
        port (int): Puerto a liberar

    Returns:
        bool: True si se liberó el puerto, False si no había procesos
    """
    try:
        # Buscar procesos usando el puerto
        result = subprocess.run(['lsof', '-ti', f':{port}'],
                              capture_output=True, text=True, check=False)

        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            print(f"🔍 Encontrados procesos usando el puerto {port}: {', '.join(pids)}")

            for pid in pids:
                if pid.strip():
                    try:
                        print(f"🔪 Terminando proceso {pid}...")
                        os.kill(int(pid), signal.SIGTERM)
                        print(f"✅ Proceso {pid} terminado")
                    except ProcessLookupError:
                        print(f"⚠️  Proceso {pid} ya no existe")
                    except PermissionError:
                        print(f"❌ Sin permisos para terminar proceso {pid}")
                        # Intentar con SIGKILL como último recurso
                        try:
                            os.kill(int(pid), signal.SIGKILL)
                            print(f"🔥 Proceso {pid} forzado a terminar")
                        except:
                            print(f"❌ No se pudo terminar proceso {pid}")
            return True
        else:
            print(f"✅ Puerto {port} está libre")
            return False

    except FileNotFoundError:
        print("⚠️  Comando 'lsof' no encontrado, intentando método alternativo...")
        # Método alternativo usando netstat
        try:
            result = subprocess.run(['netstat', '-tlnp'],
                                  capture_output=True, text=True, check=False)
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if f':{port} ' in line and 'LISTEN' in line:
                        # Extraer PID de la línea de netstat
                        parts = line.split()
                        if len(parts) > 6 and '/' in parts[6]:
                            pid = parts[6].split('/')[0]
                            try:
                                print(f"🔪 Terminando proceso {pid} (método alternativo)...")
                                os.kill(int(pid), signal.SIGTERM)
                                print(f"✅ Proceso {pid} terminado")
                                return True
                            except:
                                print(f"❌ No se pudo terminar proceso {pid}")
        except:
            pass
        return False
    except Exception as e:
        print(f"❌ Error al liberar puerto {port}: {e}")
        return False

def is_port_available(port):
    """
    Verifica si un puerto está disponible.

    Args:
        port (int): Puerto a verificar

    Returns:
        bool: True si está disponible, False si está ocupado
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', port))
            return True
    except OSError:
        return False

def ensure_port_available(port):
    """
    Asegura que el puerto esté disponible, liberándolo si es necesario.

    Args:
        port (int): Puerto a asegurar

    Returns:
        bool: True si el puerto está disponible, False si no se pudo liberar
    """
    if is_port_available(port):
        print(f"✅ Puerto {port} está disponible")
        return True

    print(f"⚠️  Puerto {port} está ocupado, intentando liberar...")
    if kill_process_on_port(port):
        # Esperar un momento para que el puerto se libere
        import time
        time.sleep(1)

        if is_port_available(port):
            print(f"✅ Puerto {port} liberado exitosamente")
            return True
        else:
            print(f"❌ No se pudo liberar el puerto {port}")
            return False
    else:
        print(f"❌ No se encontraron procesos usando el puerto {port}, pero sigue ocupado")
        return False

app = Flask(__name__)
CORS(app)  # Habilitar CORS para desarrollo

# Inicializar managers
log_manager = LogManager()
config_manager = ConfigManager()
file_watcher = FileWatcher()

def on_external_log(file_path: str):
    """Callback para cuando hay cambios en un archivo externo"""
    if not file_watcher.is_active() or not log_manager.is_active():
        return
    
    new_lines = file_watcher.get_new_content(file_path)
    for line in new_lines:
        log_manager.write_log({  # type: ignore
            "level": "external",
            "message": line,
            "url": f"file://{file_path}",
            "timestamp": datetime.now().isoformat(),
            "user_agent": "file_watcher",
            "source": os.path.basename(file_path)
        })

@app.route('/log', methods=['POST'])
def log():
    try:
        log_data = request.json
        if not log_manager.is_active():
            return jsonify({
                "status": "monitoring_disabled",
                "message": "El monitoreo está desactivado"
            })

        # Validar que log_data no sea None
        if log_data is None:
            return jsonify({
                "status": "error",
                "message": "No se recibieron datos de log"
            }), 400

        if log_manager.write_log(log_data):  # type: ignore
            return jsonify({
                "status": "success",
                "message": "Log recibido correctamente"
            })
        else:
            return jsonify({
                "status": "filtered_out",
                "message": "Log filtrado por configuración"
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/logs', methods=['GET'])
def get_logs():
    try:
        limit = request.args.get('limit', default=10, type=int)
        logs = log_manager.get_recent_logs(limit)  # type: ignore
        return jsonify({
            "status": "success",
            "data": logs
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/logs/clear', methods=['POST'])
def clear_logs():
    try:
        log_manager.clear_logs()
        return jsonify({
            "status": "success",
            "message": "Logs eliminados correctamente"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/monitoring/start', methods=['POST'])
def start_monitoring():
    try:
        log_manager.start()
        return jsonify({
            "status": "success",
            "message": "Monitoreo iniciado"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/monitoring/stop', methods=['POST'])
def stop_monitoring():
    try:
        log_manager.stop()
        return jsonify({
            "status": "success",
            "message": "Monitoreo detenido"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/config', methods=['GET'])
def get_config():
    try:
        config = config_manager.get_config()
        file_info = log_manager.get_log_file_info()  # type: ignore
        return jsonify({
            "status": "success",
            "data": {
                **config,
                "fileInfo": file_info,
                "isActive": log_manager.is_active()
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/config', methods=['POST'])
def update_config():
    try:
        new_config = request.json
        
        # Validar que new_config no sea None
        if new_config is None:
            return jsonify({
                "status": "error",
                "message": "No se recibieron datos de configuración"
            }), 400
            
        if config_manager.update_config(new_config):  # type: ignore
            # Actualizar configuración del log manager
            log_manager.set_max_file_size(new_config.get('maxFileSize', 50))
            return jsonify({
                "status": "success",
                "message": "Configuración actualizada"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Error actualizando configuración"
            }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Obtener puerto de configuración
    port = int(os.environ.get('PORT', config_manager.get_config().get('port', 7845)))

    print(f"🚀 Iniciando DevPipe Server en puerto {port}...")

    # Asegurar que el puerto esté disponible
    if not ensure_port_available(port):
        print(f"❌ No se pudo liberar el puerto {port}. Saliendo...")
        sys.exit(1)

    try:
        print(f"✅ Servidor DevPipe iniciado en http://localhost:{port}")
        print("📝 Endpoints disponibles:")
        print(f"   • GET  /config - Obtener configuración")
        print(f"   • POST /config - Actualizar configuración")
        print(f"   • POST /log - Enviar log")
        print(f"   • GET  /logs - Obtener logs recientes")
        print(f"   • POST /logs/clear - Limpiar logs")
        print(f"   • POST /monitoring/start - Iniciar monitoreo")
        print(f"   • POST /monitoring/stop - Detener monitoreo")
        print("🔗 Presiona Ctrl+C para detener el servidor")

        app.run(host='0.0.0.0', port=port, debug=False)

    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error al iniciar el servidor: {e}")
        sys.exit(1)
