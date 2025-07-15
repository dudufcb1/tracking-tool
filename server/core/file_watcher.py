import os
import time
from typing import Dict, List, Optional, Callable, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent

class LogFileHandler(FileSystemEventHandler):
    def __init__(self, callback: Callable[[str], None]):
        """
        Inicializa el manejador de eventos de archivo.
        
        Args:
            callback: Función a llamar cuando el archivo cambia
        """
        self.callback = callback
    
    def on_modified(self, event: FileModifiedEvent) -> None:
        """Maneja el evento de modificación de archivo."""
        try:
            if hasattr(event, 'src_path') and event.src_path is not None:
                # Convertir a string de forma segura
                path_str = str(event.src_path)  # type: ignore
                self.callback(path_str)
        except Exception as e:
            print(f"Error en on_modified: {e}")

class FileWatcher:
    def __init__(self):
        """Inicializa el monitor de archivos."""
        self.observer = Observer()
        self.watched_files: Dict[str, Dict[str, Any]] = {}
        self.active = False
    
    def start(self):
        """Inicia el monitoreo de archivos."""
        if not self.active:
            self.observer.start()
            self.active = True
    
    def stop(self):
        """Detiene el monitoreo de archivos."""
        if self.active:
            self.observer.stop()
            self.observer.join()
            self.active = False
            self.watched_files.clear()
    
    def is_active(self) -> bool:
        """
        Verifica si el monitoreo está activo.
        
        Returns:
            bool: True si el monitoreo está activo
        """
        return self.active
    
    def add_file(self, file_path: str, callback: Optional[Callable[[str], None]] = None) -> bool:
        """
        Añade un archivo al monitoreo.
        
        Args:
            file_path: Ruta absoluta al archivo
            callback: Función opcional a llamar cuando el archivo cambie
            
        Returns:
            bool: True si el archivo se añadió correctamente
        """
        if not os.path.exists(file_path):
            print(f"El archivo {file_path} no existe")
            return False
        
        if file_path in self.watched_files:
            print(f"El archivo {file_path} ya está siendo monitoreado")
            return False
        
        try:
            file_dir = os.path.dirname(file_path)
            handler = LogFileHandler(callback if callback else lambda x: None)
            
            watch = self.observer.schedule(handler, file_dir, recursive=False)  # type: ignore
            
            self.watched_files[file_path] = {
                "handler": handler,
                "watch": watch,
                "last_position": os.path.getsize(file_path),
                "last_modified": os.path.getmtime(file_path)
            }
            
            if not self.active:
                self.start()
            
            return True
        except Exception as e:
            print(f"Error añadiendo archivo {file_path}: {e}")
            return False
    
    def remove_file(self, file_path: str) -> bool:
        """
        Elimina un archivo del monitoreo.
        
        Args:
            file_path: Ruta al archivo
            
        Returns:
            bool: True si el archivo se eliminó correctamente
        """
        if file_path not in self.watched_files:
            return False
        
        try:
            watch = self.watched_files[file_path]["watch"]
            self.observer.unschedule(watch)  # type: ignore
            del self.watched_files[file_path]
            return True
        except Exception as e:
            print(f"Error eliminando archivo {file_path}: {e}")
            return False
    
    def get_new_content(self, file_path: str) -> List[str]:
        """
        Obtiene el nuevo contenido de un archivo desde la última lectura.
        
        Args:
            file_path: Ruta al archivo
            
        Returns:
            List[str]: Lista de nuevas líneas
        """
        if file_path not in self.watched_files:
            return []
        
        try:
            file_info = self.watched_files[file_path]
            current_size = os.path.getsize(file_path)
            last_position = file_info["last_position"]
            
            if current_size < last_position:
                # El archivo fue truncado
                last_position = 0
            
            if current_size == last_position:
                return []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                f.seek(last_position)
                new_lines = f.readlines()
                
                # Actualizar posición
                file_info["last_position"] = current_size
                file_info["last_modified"] = os.path.getmtime(file_path)
                
                return [line.strip() for line in new_lines if line.strip()]
        except Exception as e:
            print(f"Error leyendo archivo {file_path}: {e}")
            return []
    
    def get_watched_files(self) -> List[Dict[str, Any]]:
        """
        Obtiene la lista de archivos monitoreados.
        
        Returns:
            List[Dict]: Lista de información de archivos
        """
        files: List[Dict[str, Any]] = []
        for path, info in self.watched_files.items():
            try:
                current_size = os.path.getsize(path)
                file_info: Dict[str, Any] = {
                    "path": path,
                    "size": current_size,
                    "last_modified": time.ctime(info["last_modified"]),
                    "name": os.path.basename(path)
                }
                files.append(file_info)
            except Exception as e:
                print(f"Error obteniendo información de {path}: {e}")
                continue
        return files
