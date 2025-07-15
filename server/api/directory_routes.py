from flask import Blueprint, jsonify, request
from typing import Optional
from core.directory_manager import DirectoryManager

# Crear Blueprint para las rutas de directorios
directory_routes = Blueprint('directory_routes', __name__)

# Variable global para el DirectoryManager (se asignará desde main.py)
directory_manager: Optional[DirectoryManager] = None

def init_directory_manager(dm: DirectoryManager) -> None:
    """Inicializa el DirectoryManager desde main.py"""
    global directory_manager
    directory_manager = dm

@directory_routes.route('/api/save-directory', methods=['POST'])
def save_directory():
    """Endpoint para guardar un directorio y generar un token."""
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            return jsonify({
                "success": False,
                "message": "No se proporcionó la ruta del directorio"
            }), 400
            
        directory_path = data['path']
        token = directory_manager.create_token(directory_path)
        
        return jsonify({
            "success": True,
            "token": token,
            "info": directory_manager.get_directory_info(token)
        })
        
    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error interno: {str(e)}"
        }), 500

@directory_routes.route('/api/directory-info', methods=['GET'])
def get_directory_info():
    """Endpoint para obtener información de un directorio."""
    try:
        token = request.args.get('token')
        if not token:
            return jsonify({
                "status": "error",
                "message": "Token no proporcionado"
            }), 400
            
        info = directory_manager.get_directory_info(token)
        if not info:
            return jsonify({
                "status": "error",
                "message": "Token inválido o directorio no encontrado"
            }), 404
            
        return jsonify({
            "status": "success",
            "data": {
                "info": info
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error interno: {str(e)}"
        }), 500

@directory_routes.route('/api/directory', methods=['DELETE'])
def remove_directory():
    """Endpoint para eliminar la configuración de un directorio."""
    try:
        token = request.args.get('token')
        if not token:
            return jsonify({
                "success": False,
                "message": "Token no proporcionado"
            }), 400

        if directory_manager.remove_token(token):
            return jsonify({
                "success": True,
                "message": "Configuración de directorio eliminada"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Token inválido o directorio no encontrado"
            }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error interno: {str(e)}"
        }), 500

@directory_routes.route('/api/directories', methods=['GET'])
def list_directories():
    """Endpoint para listar todos los directorios configurados."""
    try:
        directories = []
        for token, path in directory_manager.directory_tokens.items():
            info = directory_manager.get_directory_info(token)
            directories.append({
                "token": token,
                "path": path,
                "info": info
            })

        return jsonify({
            "status": "success",
            "data": directories
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error interno: {str(e)}"
        }), 500
