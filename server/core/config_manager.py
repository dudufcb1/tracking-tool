import json
import os
from typing import Dict, List, Any

class ConfigManager:
    def __init__(self, config_file: str = "config/config.json"):
        """
        Inicializa el gestor de configuración.
        
        Args:
            config_file: Ruta al archivo de configuración
        """
        self.config_file = config_file
        self.config = self.load_default_config()
        self._ensure_config_dir()
        self.load_config()
    
    def _ensure_config_dir(self):
        """Asegura que existe el directorio de configuración."""
        config_dir = os.path.dirname(self.config_file)
        if not os.path.exists(config_dir):
            os.makedirs(config_dir)
    
    def load_default_config(self) -> Dict[str, Any]:
        """
        Carga la configuración por defecto.
        
        Returns:
            Dict: Configuración por defecto
        """
        return {
            "maxFileSize": 50,  # KB
            "maxLogs": 10,
            "urlFilters": [],
            "port": 7845,
            "logDir": "logs",
            "monitoring": {
                "enabled": False,
                "intervalMs": 1000
            },
            "externalLogPath": "",  # Ruta del archivo de logs externos (WordPress)
            "mergedLogPath": "logs/devpipe_merged.log"  # Ruta del archivo merged
        }
    
    def load_config(self) -> None:
        """Carga la configuración desde el archivo."""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, "r", encoding="utf-8") as f:
                    loaded_config = json.load(f)
                    # Actualizar solo las claves que existen en la configuración por defecto
                    for key in self.config:
                        if key in loaded_config:
                            self.config[key] = loaded_config[key]
        except Exception as e:
            print(f"Error cargando configuración: {e}")
            # Si hay error, usar configuración por defecto
            self.save_config()
    
    def save_config(self) -> bool:
        """
        Guarda la configuración en el archivo.
        
        Returns:
            bool: True si la configuración se guardó correctamente
        """
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2)
            return True
        except Exception as e:
            print(f"Error guardando configuración: {e}")
            return False
    
    def get_config(self) -> Dict[str, Any]:
        """
        Obtiene la configuración actual.
        
        Returns:
            Dict: Configuración actual
        """
        return self.config
    
    def update_config(self, new_config: Dict[str, Any]) -> bool:
        """
        Actualiza la configuración.
        
        Args:
            new_config: Nueva configuración
            
        Returns:
            bool: True si la configuración se actualizó correctamente
        """
        try:
            # Solo actualizar claves válidas
            for key in self.config:
                if key in new_config:
                    self.config[key] = new_config[key]
            
            return self.save_config()
        except Exception as e:
            print(f"Error actualizando configuración: {e}")
            return False
    
    def get_url_filters(self) -> List[str]:
        """
        Obtiene los filtros de URL.

        Returns:
            List[str]: Lista de filtros
        """
        return self.config.get("urlFilters", [])

    def get_external_log_path(self) -> str:
        """
        Obtiene la ruta del archivo de logs externos.

        Returns:
            str: Ruta del archivo de logs externos
        """
        return self.config.get("externalLogPath", "")

    def set_external_log_path(self, path: str) -> bool:
        """
        Establece la ruta del archivo de logs externos.

        Args:
            path: Nueva ruta del archivo

        Returns:
            bool: True si se guardó correctamente
        """
        try:
            self.config["externalLogPath"] = path
            return self.save_config()
        except Exception as e:
            print(f"Error estableciendo ruta externa: {e}")
            return False

    def get_merged_log_path(self) -> str:
        """
        Obtiene la ruta del archivo merged.

        Returns:
            str: Ruta del archivo merged
        """
        return self.config.get("mergedLogPath", "logs/devpipe_merged.log")

    def set_merged_log_path(self, path: str) -> bool:
        """
        Establece la ruta del archivo merged.

        Args:
            path: Nueva ruta del archivo

        Returns:
            bool: True si se guardó correctamente
        """
        try:
            self.config["mergedLogPath"] = path
            return self.save_config()
        except Exception as e:
            print(f"Error estableciendo ruta merged: {e}")
            return False
