import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from .directory_manager import DirectoryManager

class LogManager:
    def __init__(self, base_dir: str = "logs", directory_manager: Optional[DirectoryManager] = None):
        """
        Inicializa el gestor de logs.
        
        Args:
            base_dir: Directorio base donde se guardarán los logs por defecto
            directory_manager: Instancia de DirectoryManager para manejar directorios personalizados
        """
        self.base_dir: str = base_dir
        self.directory_manager: DirectoryManager = directory_manager or DirectoryManager(base_dir)
        self.max_file_size: int = 50 * 1024  # 50KB por defecto
        self.active: bool = False
        self.current_token: Optional[str] = None
        self._ensure_log_dir(self.base_dir)
    
    def _ensure_log_dir(self, directory: str) -> None:
        """Asegura que existe el directorio de logs."""
        if not os.path.exists(directory):
            os.makedirs(directory)
    
    def _get_log_directory(self) -> str:
        """
        Obtiene el directorio actual de logs.
        
        Returns:
            str: Directorio actual de logs
        """
        if self.current_token:
            custom_dir = self.directory_manager.get_directory(self.current_token)
            if custom_dir:
                return custom_dir
        return self.base_dir
    
    def _get_log_file(self) -> str:
        """
        Obtiene el nombre del archivo de log actual.
        
        Returns:
            str: Ruta completa al archivo de log
        """
        return os.path.join(self._get_log_directory(), "devpipe.log")
    
    def start(self) -> None:
        """Inicia la captura de logs."""
        self.active = True
    
    def stop(self) -> None:
        """Detiene la captura de logs."""
        self.active = False
    
    @property
    def is_active(self) -> bool:
        """Retorna si la captura está activa."""
        return self.active
    
    def should_accept_log(self, log_data: Dict[str, Any]) -> bool:
        """
        Determina si un log debe ser aceptado según los filtros.
        
        Args:
            log_data: Datos del log a evaluar
            
        Returns:
            bool: True si el log debe ser aceptado
        """
        # TODO: Implementar filtros de URL
        return True

    def set_log_directory_token(self, token: Optional[str]) -> bool:
        """
        Establece el token del directorio personalizado.
        
        Args:
            token: Token del directorio o None para usar el directorio base
            
        Returns:
            bool: True si se estableció correctamente
        """
        if self.active:
            return False
            
        if token:
            directory = self.directory_manager.get_directory(token)
            if not directory:
                return False
                
        self.current_token = token
        return True
    
    def get_current_token(self) -> Optional[str]:
        """
        Obtiene el token del directorio actual.
        
        Returns:
            Optional[str]: Token actual o None si se usa el directorio base
        """
        return self.current_token
    
    def write_log(self, log_data: Dict[str, Any]) -> bool:
        """
        Escribe un log en el archivo.
        
        Args:
            log_data: Datos del log a escribir
            
        Returns:
            bool: True si el log fue escrito correctamente
        """
        if not self.active:
            return False
            
        if not self.should_accept_log(log_data):
            return False
        
        try:
            log_file = self._get_log_file()
            
            # Verificar tamaño del archivo
            if os.path.exists(log_file):
                if os.path.getsize(log_file) >= self.max_file_size:
                    # Rotar archivo
                    self._rotate_log_file(log_file)
            
            # Añadir timestamp de servidor
            log_data["server_timestamp"] = datetime.now().isoformat()
            
            # Escribir log
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_data) + "\n")
            
            return True
        except Exception as e:
            print(f"Error escribiendo log: {e}")
            return False
    
    def _rotate_log_file(self, log_file: str):
        """
        Rota el archivo de log cuando alcanza el tamaño máximo.
        
        Args:
            log_file: Ruta al archivo de log
        """
        if os.path.exists(log_file):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup = f"{log_file}.{timestamp}"
            os.rename(log_file, backup)
    
    def get_recent_logs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Obtiene los logs más recientes.
        
        Args:
            limit: Número máximo de logs a retornar
            
        Returns:
            List[Dict]: Lista de logs
        """
        logs: List[Dict[str, Any]] = []
        log_file = self._get_log_file()
        
        if not os.path.exists(log_file):
            return logs
        
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                # Leer las últimas 'limit' líneas
                lines = f.readlines()[-limit:]
                for line in lines:
                    try:
                        log = json.loads(line.strip())
                        logs.append(log)
                    except:
                        continue
        except Exception as e:
            print(f"Error leyendo logs: {e}")
        
        return logs
    
    def clear_logs(self):
        """Limpia todos los logs."""
        log_file = self._get_log_file()
        if os.path.exists(log_file):
            os.remove(log_file)
    
    def set_max_file_size(self, size_in_kb: int):
        """
        Establece el tamaño máximo del archivo de logs.

        Args:
            size_in_kb: Tamaño máximo en kilobytes
        """
        self.max_file_size = size_in_kb * 1024

    def set_log_directory(self, new_log_dir: str) -> bool:
        """
        Cambia el directorio de logs. Solo permitido cuando el servicio está detenido.

        Args:
            new_log_dir: Nuevo directorio donde se guardarán los logs

        Returns:
            bool: True si el directorio se cambió correctamente, False si el servicio está activo
        """
        if self.active:
            return False

        self.base_dir = new_log_dir
        self._ensure_log_dir(new_log_dir)
        return True

    def get_log_directory(self) -> str:
        """
        Obtiene el directorio actual de logs.

        Returns:
            str: Directorio actual de logs
        """
        return self._get_log_directory()
    
    def get_log_file_info(self) -> Dict[str, Any]:
        """
        Obtiene información sobre el archivo de log actual.
        
        Returns:
            Dict: Información del archivo
        """
        log_file = self._get_log_file()
        info: Dict[str, Any] = {
            "path": log_file,
            "exists": os.path.exists(log_file),
            "size": 0,
            "size_kb": 0,
            "last_modified": None
        }
        
        if info["exists"]:
            info["size"] = os.path.getsize(log_file)
            info["size_kb"] = info["size"] / 1024
            info["last_modified"] = datetime.fromtimestamp(
                os.path.getmtime(log_file)
            ).isoformat()
        
        return info
