from flask import Blueprint, jsonify, request
from core.directory_manager import DirectoryManager

# Crear instancia de DirectoryManager
directory_manager = DirectoryManager()

# Crear Blueprint para las rutas de directorios
directory_routes = Blueprint('directory_routes', __name__)

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
                "success": False,
                "message": "Token no proporcionado"
            }), 400
            
        info = directory_manager.get_directory_info(token)
        if not info:
            return jsonify({
                "success": False,
                "message": "Token inválido o directorio no encontrado"
            }), 404
            
        return jsonify({
            "success": True,
            "info": info
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
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
