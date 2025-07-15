import os
import secrets
import json
from datetime import datetime
from typing import Dict, Optional, Any

class DirectoryManager:
    def __init__(self, base_dir: str = "logs", tokens_file: str = "config/directory_tokens.json"):
        """
        Inicializa el gestor de directorios.
        
        Args:
            base_dir: Directorio base para logs por defecto
            tokens_file: Archivo para persistir los tokens
        """
        self.base_dir = base_dir
        self.tokens_file = tokens_file
        self.directory_tokens: Dict[str, str] = {}
        self._load_tokens()
    
    def _load_tokens(self):
        """Carga los tokens guardados desde el archivo."""
        try:
            if os.path.exists(self.tokens_file):
                with open(self.tokens_file, 'r') as f:
                    self.directory_tokens = json.load(f)
        except Exception as e:
            print(f"Error cargando tokens: {e}")
            self.directory_tokens = {}
    
    def _save_tokens(self):
        """Guarda los tokens en el archivo."""
        try:
            os.makedirs(os.path.dirname(self.tokens_file), exist_ok=True)
            with open(self.tokens_file, 'w') as f:
                json.dump(self.directory_tokens, f, indent=2)
        except Exception as e:
            print(f"Error guardando tokens: {e}")
    
    def _generate_token(self, length: int = 32) -> str:
        """Genera un token único."""
        return secrets.token_hex(length)
    
    def _sanitize_path(self, path: str) -> str:
        """
        Sanitiza una ruta para prevenir path traversal.
        
        Args:
            path: Ruta a sanitizar
            
        Returns:
            str: Ruta sanitizada y absoluta
        """
        # Convertir a ruta absoluta
        abs_path = os.path.abspath(path)
        
        # Verificar que no hay intentos de path traversal
        if not os.path.commonpath([abs_path]).startswith('/'):
            raise ValueError("Ruta inválida: intento de path traversal detectado")
            
        return abs_path
    
    def create_token(self, directory_path: str) -> str:
        """
        Crea un token para un directorio.
        
        Args:
            directory_path: Ruta al directorio
            
        Returns:
            str: Token generado
            
        Raises:
            ValueError: Si la ruta es inválida
        """
        try:
            # Sanitizar y validar la ruta
            abs_path = self._sanitize_path(directory_path)
            
            # Verificar que el directorio existe o se puede crear
            os.makedirs(abs_path, exist_ok=True)
            
            # Generar token
            token = self._generate_token()
            
            # Guardar mapeo token -> ruta
            self.directory_tokens[token] = abs_path
            self._save_tokens()
            
            return token
            
        except Exception as e:
            raise ValueError(f"Error creando token para directorio: {e}")
    
    def get_directory(self, token: str) -> Optional[str]:
        """
        Obtiene la ruta del directorio asociado a un token.
        
        Args:
            token: Token del directorio
            
        Returns:
            Optional[str]: Ruta al directorio o None si el token no existe
        """
        return self.directory_tokens.get(token)
    
    def remove_token(self, token: str) -> bool:
        """
        Elimina un token y su directorio asociado.
        
        Args:
            token: Token a eliminar
            
        Returns:
            bool: True si se eliminó correctamente
        """
        if token in self.directory_tokens:
            del self.directory_tokens[token]
            self._save_tokens()
            return True
        return False
    
    def get_directory_info(self, token: str) -> Dict[str, Any]:
        """
        Obtiene información sobre el directorio asociado a un token.
        
        Args:
            token: Token del directorio
            
        Returns:
            Dict[str, Any]: Información del directorio o diccionario vacío si no existe
        """
        directory = self.get_directory(token)
        if not directory:
            return {}
            
        info: Dict[str, Any] = {
            "path": directory,
            "exists": os.path.exists(directory),
            "isWritable": os.access(directory, os.W_OK),
            "created": None,
            "lastModified": None
        }
        
        if info["exists"]:
            stat = os.stat(directory)
            info["created"] = datetime.fromtimestamp(stat.st_ctime).isoformat()
            info["lastModified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            
        return info
