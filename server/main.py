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
from core.directory_manager import DirectoryManager
from core.merge_manager import MergeManager
from api.directory_routes import directory_routes, init_directory_manager

# Crear instancias compartidas
directory_manager = DirectoryManager()
config_manager = ConfigManager()
log_manager = LogManager(directory_manager=directory_manager, config_manager=config_manager)
merge_manager = MergeManager(log_manager=log_manager, config_manager=config_manager)

# Inicializar el DirectoryManager en el módulo directory_routes
init_directory_manager(directory_manager)

def kill_process_on_port(port: int) -> bool:
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

def is_port_available(port: int) -> bool:
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

def ensure_port_available(port: int) -> bool:
    """
    Asegura que el puerto esté disponible, liberándolo si es necesario.
    Intenta múltiples veces y métodos para liberar el puerto.

    Args:
        port (int): Puerto a asegurar

    Returns:
        bool: True si el puerto está disponible, False si no se pudo liberar
    """
    max_attempts = 3

    for attempt in range(max_attempts):
        if is_port_available(port):
            print(f"✅ Puerto {port} está disponible")
            return True

        print(f"⚠️  Puerto {port} está ocupado (intento {attempt + 1}/{max_attempts}), intentando liberar...")

        # Intentar liberar el puerto
        if kill_process_on_port(port):
            # Esperar un momento para que el puerto se libere
            import time
            time.sleep(2)  # Aumentar el tiempo de espera

            # Verificar nuevamente
            if is_port_available(port):
                print(f"✅ Puerto {port} liberado exitosamente")
                return True

        # Si no se pudo liberar, esperar un poco más antes del siguiente intento
        if attempt < max_attempts - 1:
            print(f"🔄 Esperando antes del siguiente intento...")
            import time
            time.sleep(3)

    print(f"❌ No se pudo liberar el puerto {port} después de {max_attempts} intentos")
    return False

app = Flask(__name__)
CORS(app)  # Habilitar CORS para desarrollo

# Los managers ya fueron inicializados al principio del archivo

# Registrar el blueprint de directorios
app.register_blueprint(directory_routes)
file_watcher = FileWatcher()

# Variable global eliminada - ahora se usa config_manager para persistencia

def on_external_log(file_path: str) -> None:
    """Callback para cuando hay cambios en un archivo externo"""
    if not file_watcher.is_active or not log_manager.is_active:
        return

    new_lines = file_watcher.get_new_content(file_path)
    for line in new_lines:
        log_manager.write_log({
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
        if not log_manager.is_active:
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

        if log_manager.write_log(log_data):
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
        logs = log_manager.get_recent_logs(limit)
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

@app.route('/monitoring/status', methods=['GET'])
def get_monitoring_status():
    """Obtener el estado actual del monitoreo"""
    try:
        is_active = log_manager.is_active
        return jsonify({
            'status': 'success',
            'data': {
                'isActive': is_active
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error al obtener estado: {str(e)}'
        }), 500

@app.route('/config', methods=['GET'])
def get_config():
    try:
        config = config_manager.get_config()
        file_info = log_manager.get_log_file_info()
        return jsonify({
            "status": "success",
            "data": {
                **config,
                "fileInfo": file_info,
                "isActive": log_manager.is_active
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

        # Verificar si se está intentando cambiar el directorio de logs
        if 'customLogPath' in new_config:
            if log_manager.is_active:
                return jsonify({
                    "status": "error",
                    "message": "No se puede cambiar el directorio de logs mientras el servicio está activo"
                }), 400

            custom_token = new_config['customLogPath']  # Ahora recibimos el token directamente
            if custom_token:
                try:
                    # Verificar que el token existe
                    directory = directory_manager.get_directory(custom_token)
                    if not directory:
                        return jsonify({
                            "status": "error",
                            "message": "Token de directorio inválido"
                        }), 400

                    # Configurar el LogManager para usar el directorio del token
                    if not log_manager.set_log_directory_token(custom_token):
                        return jsonify({
                            "status": "error",
                            "message": "No se pudo configurar el directorio de logs"
                        }), 500
                except Exception as e:
                    return jsonify({
                        "status": "error",
                        "message": f"Error configurando directorio: {str(e)}"
                    }), 400
            else:
                # Si no hay token, volver al directorio base
                log_manager.set_log_directory_token(None)

        if config_manager.update_config(new_config):
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

# Endpoints para logs externos
@app.route('/api/external-log/path', methods=['POST'])
def set_external_log_path_config():
    """Establece la ruta del archivo de log externo"""
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            return jsonify({
                "message": "No se proporcionó la ruta del archivo"
            }), 400

        path = data['path']
        if not os.path.isabs(path):
            return jsonify({
                "message": "La ruta debe ser absoluta"
            }), 400

        # Usar config_manager para persistir la configuración
        success = config_manager.set_external_log_path(path)
        if success:
            return jsonify({
                "message": f"Ruta establecida: {path}"
            })
        else:
            return jsonify({
                "message": "Error al guardar la configuración"
            }), 500
    except Exception as e:
        return jsonify({
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/external-log/exists', methods=['GET'])
def check_external_log_exists():
    """Verifica si el archivo de log externo existe"""
    try:
        # Usar config_manager para obtener la ruta persistente
        external_log_path = config_manager.get_external_log_path()

        if not external_log_path:
            return jsonify({
                "exists": False,
                "path": ""
            })

        exists = os.path.exists(external_log_path)
        return jsonify({
            "exists": exists,
            "path": external_log_path
        })
    except Exception as e:
        return jsonify({
            "exists": False,
            "path": external_log_path or "",
            "error": str(e)
        })

@app.route('/api/external-log/stats', methods=['GET'])
def get_external_log_stats():
    """Obtiene estadísticas del archivo de log externo"""
    try:
        # Usar config_manager para obtener la ruta persistente
        external_log_path = config_manager.get_external_log_path()

        if not external_log_path:
            return jsonify({
                "message": "No se ha establecido una ruta de archivo"
            }), 400

        if not os.path.exists(external_log_path):
            return jsonify({
                "message": "El archivo no existe"
            }), 404

        size_bytes = os.path.getsize(external_log_path)
        return jsonify({
            "path": external_log_path,
            "size_bytes": size_bytes
        })
    except Exception as e:
        return jsonify({
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/external-log/content', methods=['GET'])
def get_external_log_content():
    """Obtiene todo el contenido del archivo de log externo"""
    try:
        # Usar config_manager para obtener la ruta persistente
        external_log_path = config_manager.get_external_log_path()

        if not external_log_path:
            return jsonify({
                "message": "No se ha establecido una ruta de archivo"
            }), 400

        if not os.path.exists(external_log_path):
            return jsonify({
                "message": "El archivo no existe"
            }), 404

        with open(external_log_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        return jsonify({
            "path": external_log_path,
            "content": content
        })
    except Exception as e:
        return jsonify({
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/external-log/lines/<int:n>', methods=['GET'])
def get_external_log_last_n_lines(n):
    """Obtiene las últimas N líneas del archivo de log externo"""
    try:
        # Usar config_manager para obtener la ruta persistente
        external_log_path = config_manager.get_external_log_path()

        if not external_log_path:
            return jsonify({
                "message": "No se ha establecido una ruta de archivo"
            }), 400

        if not os.path.exists(external_log_path):
            return jsonify({
                "message": "El archivo no existe"
            }), 404

        if n <= 0 or n > 10000:
            return jsonify({
                "message": "El número de líneas debe estar entre 1 y 10000"
            }), 400

        with open(external_log_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        # Obtener las últimas N líneas
        last_lines = lines[-n:] if len(lines) >= n else lines
        # Limpiar saltos de línea
        last_lines = [line.rstrip('\n\r') for line in last_lines]

        return jsonify({
            "path": external_log_path,
            "lines": last_lines
        })
    except Exception as e:
        return jsonify({
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/external-log/clear', methods=['DELETE'])
def clear_external_log():
    """Borra el contenido del archivo de log externo"""
    try:
        # Usar config_manager para obtener la ruta persistente
        external_log_path = config_manager.get_external_log_path()

        if not external_log_path:
            return jsonify({
                "message": "No se ha establecido una ruta de archivo"
            }), 400

        if not os.path.exists(external_log_path):
            return jsonify({
                "message": "El archivo no existe"
            }), 404

        # Vaciar el archivo
        with open(external_log_path, 'w', encoding='utf-8') as f:
            f.write('')

        return jsonify({
            "message": f"Contenido del archivo {external_log_path} borrado correctamente"
        })
    except Exception as e:
        return jsonify({
            "message": f"Error: {str(e)}"
        }), 500

# Endpoints para merge logs
@app.route('/api/merge-logs/stats', methods=['GET'])
def get_merge_stats():
    """Obtiene estadísticas de los archivos de logs"""
    try:
        # La ruta externa ya está configurada en merge_manager a través de config_manager
        # No necesitamos hacer nada adicional aquí
        
        stats = merge_manager.get_merged_stats()
        return jsonify({
            "status": "success",
            "data": stats
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/merge-logs/create', methods=['POST'])
def create_merged_logs():
    """Crea el archivo devpipe_merged.log"""
    try:
        data = request.get_json() or {}
        internal_limit = data.get('internal_limit')
        external_limit = data.get('external_limit')
        sort_by_time = data.get('sort_by_time', True)
        
        # La ruta externa ya está configurada en merge_manager a través de config_manager
        # No necesitamos hacer nada adicional aquí
        
        merged_file_path = merge_manager.create_merged_file(
            internal_limit=internal_limit,
            external_limit=external_limit,
            sort_by_time=sort_by_time
        )
        
        return jsonify({
            "status": "success",
            "message": "Archivo merged creado correctamente",
            "data": {
                "file_path": merged_file_path
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/merge-logs/content', methods=['GET'])
def get_merged_content():
    """Obtiene el contenido del archivo merged"""
    try:
        # Parámetros de consulta
        js_lines = request.args.get('js', type=int)  # Líneas de logs internos (JS)
        wp_lines = request.args.get('wp', type=int)  # Líneas de logs externos (WordPress)
        sort_by_time = request.args.get('sort_by_time', 'true').lower() == 'true'
        
        # La ruta externa ya está configurada en merge_manager a través de config_manager
        # No necesitamos hacer nada adicional aquí
        
        # Obtener logs combinados
        merged_logs = merge_manager.merge_logs(
            internal_limit=js_lines,
            external_limit=wp_lines,
            sort_by_time=sort_by_time
        )
        
        # Formatear logs para respuesta
        formatted_logs = []
        for log in merged_logs:
            formatted_logs.append(merge_manager.format_log_for_merged_file(log))
        
        return jsonify({
            "status": "success",
            "data": {
                "logs": formatted_logs,
                "total_lines": len(formatted_logs),
                "internal_lines": js_lines or "all",
                "external_lines": wp_lines or "all"
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/merge-logs/clear-all', methods=['DELETE'])
def clear_all_logs():
    """Borra todos los archivos de logs"""
    try:
        # La ruta externa ya está configurada en merge_manager a través de config_manager
        # No necesitamos hacer nada adicional aquí
        
        results = merge_manager.clear_all_logs()
        
        return jsonify({
            "status": "success",
            "message": "Operación de limpieza completada",
            "data": results
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/merge-logs/export', methods=['GET'])
def export_merged_logs():
    """Exporta los logs merged como texto plano"""
    try:
        # Parámetros de consulta
        js_lines = request.args.get('js', type=int)
        wp_lines = request.args.get('wp', type=int)
        sort_by_time = request.args.get('sort_by_time', 'true').lower() == 'true'
        
        # La ruta externa ya está configurada en merge_manager a través de config_manager
        # No necesitamos hacer nada adicional aquí
        
        # Obtener logs combinados
        merged_logs = merge_manager.merge_logs(
            internal_limit=js_lines,
            external_limit=wp_lines,
            sort_by_time=sort_by_time
        )
        
        # Crear texto plano
        text_content = []
        for log in merged_logs:
            text_content.append(merge_manager.format_log_for_merged_file(log))
        
        return jsonify({
            "status": "success",
            "data": {
                "content": "\n".join(text_content),
                "total_lines": len(text_content)
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Endpoints para configuración de rutas de archivos
@app.route('/api/config/external-log-path', methods=['GET'])
def api_get_external_log_path():
    """Obtiene la ruta del archivo de logs externos"""
    try:
        path = config_manager.get_external_log_path()
        return jsonify({
            "status": "success",
            "data": {
                "path": path,
                "exists": os.path.exists(path) if path else False
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/config/external-log-path', methods=['POST'])
def set_external_log_path_config_v2():
    """Establece la ruta del archivo de logs externos"""
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            return jsonify({
                "status": "error",
                "message": "No se proporcionó la ruta del archivo"
            }), 400

        path = data['path']
        if path and not os.path.isabs(path):
            return jsonify({
                "status": "error",
                "message": "La ruta debe ser absoluta"
            }), 400

        success = config_manager.set_external_log_path(path)
        if success:
            return jsonify({
                "status": "success",
                "message": f"Ruta establecida: {path}",
                "data": {
                    "path": path,
                    "exists": os.path.exists(path) if path else False
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Error al guardar la configuración"
            }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/config/external-log-path', methods=['DELETE'])
def delete_external_log_path_config():
    """Borra la ruta del archivo de logs externos"""
    try:
        success = config_manager.set_external_log_path("")
        if success:
            return jsonify({
                "status": "success",
                "message": "Ruta del archivo externo borrada"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Error al borrar la configuración"
            }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/config/merged-log-path', methods=['GET'])
def get_merged_log_path():
    """Obtiene la ruta del archivo merged"""
    try:
        path = config_manager.get_merged_log_path()
        return jsonify({
            "status": "success",
            "data": {
                "path": path,
                "exists": os.path.exists(path) if path else False
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/config/merged-log-path', methods=['POST'])
def set_merged_log_path():
    """Establece la ruta del archivo merged"""
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            return jsonify({
                "status": "error",
                "message": "No se proporcionó la ruta del archivo"
            }), 400

        path = data['path']
        if not path:
            return jsonify({
                "status": "error",
                "message": "La ruta no puede estar vacía"
            }), 400

        success = config_manager.set_merged_log_path(path)
        if success:
            return jsonify({
                "status": "success",
                "message": f"Ruta establecida: {path}",
                "data": {
                    "path": path,
                    "exists": os.path.exists(path) if path else False
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Error al guardar la configuración"
            }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/config/merged-log-path', methods=['DELETE'])
def delete_merged_log_path():
    """Resetea la ruta del archivo merged al valor por defecto"""
    try:
        success = config_manager.set_merged_log_path("logs/devpipe_merged.log")
        if success:
            return jsonify({
                "status": "success",
                "message": "Ruta del archivo merged reseteada al valor por defecto"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Error al resetear la configuración"
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
        print(f"   • POST /api/external-log/path - Establecer archivo externo")
        print(f"   • GET  /api/external-log/exists - Verificar archivo externo")
        print(f"   • GET  /api/external-log/stats - Estadísticas archivo externo")
        print(f"   • GET  /api/external-log/content - Contenido archivo externo")
        print(f"   • GET  /api/external-log/lines/<n> - Últimas N líneas")
        print(f"   • DELETE /api/external-log/clear - Borrar archivo externo")
        print(f"   • GET  /api/merge-logs/stats - Estadísticas de merge")
        print(f"   • POST /api/merge-logs/create - Crear archivo merged")
        print(f"   • GET  /api/merge-logs/content - Contenido merged")
        print(f"   • DELETE /api/merge-logs/clear-all - Borrar todos los logs")
        print(f"   • GET  /api/merge-logs/export - Exportar logs merged")
        print(f"   • GET  /api/merge-logs/stats - Estadísticas de merge")
        print(f"   • POST /api/merge-logs/create - Crear archivo merged")
        print(f"   • GET  /api/merge-logs/content - Contenido merged")
        print(f"   • DELETE /api/merge-logs/clear-all - Borrar todos los logs")
        print(f"   • GET  /api/merge-logs/export - Exportar logs merged")
        print(f"   • GET  /api/merge-logs/stats - Estadísticas de merge")
        print(f"   • POST /api/merge-logs/create - Crear archivo merged")
        print(f"   • GET  /api/merge-logs/content - Contenido merged")
        print(f"   • DELETE /api/merge-logs/clear-all - Borrar todos los logs")
        print(f"   • GET  /api/merge-logs/export - Exportar logs merged")
        print("🔗 Presiona Ctrl+C para detener el servidor")

        app.run(host='0.0.0.0', port=port, debug=False)

    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error al iniciar el servidor: {e}")
        sys.exit(1)
