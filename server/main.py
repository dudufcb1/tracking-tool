from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime

from core.log_manager import LogManager
from core.config_manager import ConfigManager
from core.file_watcher import FileWatcher

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
    port = int(os.environ.get('PORT', config_manager.get_config().get('port', 7845)))
    app.run(host='0.0.0.0', port=port)
