import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dateutil import parser


class MergeManager:
    def __init__(self, log_manager=None, config_manager=None):
        """
        Inicializa el gestor de merge de logs.

        Args:
            log_manager: Instancia de LogManager para acceder a logs internos
            config_manager: Instancia de ConfigManager para configuración persistente
        """
        self.log_manager = log_manager
        self.config_manager = config_manager
        self.merged_file_name = "devpipe_merged.log"
    
    def get_external_log_path(self) -> str:
        """Obtiene la ruta del archivo de logs externos desde configuración."""
        if self.config_manager:
            return self.config_manager.get_external_log_path()
        return ""

    def set_external_log_path(self, path: str) -> bool:
        """Establece la ruta del archivo de logs externos en configuración."""
        if self.config_manager:
            return self.config_manager.set_external_log_path(path)
        return False

    def get_merged_file_path(self) -> str:
        """Obtiene la ruta del archivo merged desde configuración."""
        if self.config_manager:
            configured_path = self.config_manager.get_merged_log_path()

            # Si la ruta configurada es un directorio, agregar el nombre del archivo
            if os.path.isdir(configured_path):
                return os.path.join(configured_path, self.merged_file_name)

            # Si la ruta no tiene extensión, agregar el nombre del archivo
            if not os.path.splitext(configured_path)[1]:
                return os.path.join(configured_path, self.merged_file_name)

            return configured_path

        # Fallback si no hay config_manager
        if self.log_manager:
            log_dir = self.log_manager._get_log_directory()
        else:
            log_dir = "logs"
        return os.path.join(log_dir, self.merged_file_name)

    def set_merged_file_path(self, path: str) -> bool:
        """Establece la ruta del archivo merged en configuración."""
        if self.config_manager:
            return self.config_manager.set_merged_log_path(path)
        return False
    
    def get_internal_logs(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Obtiene logs internos (de devpipe.js).
        
        Args:
            limit: Número máximo de logs a obtener (None = todos)
            
        Returns:
            Lista de logs internos con timestamp parseado
        """
        logs = []
        if not self.log_manager:
            return logs
            
        log_file = self.log_manager._get_log_file()
        if not os.path.exists(log_file):
            return logs
        
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
                if limit:
                    lines = lines[-limit:]
                
                for line in lines:
                    try:
                        log = json.loads(line.strip())
                        # Añadir timestamp parseado para ordenamiento
                        timestamp_str = log.get('timestamp') or log.get('server_timestamp', '')
                        if timestamp_str:
                            try:
                                log['parsed_timestamp'] = parser.parse(timestamp_str)
                            except:
                                log['parsed_timestamp'] = datetime.now()
                        else:
                            log['parsed_timestamp'] = datetime.now()
                        
                        log['source_type'] = 'CONSOLA'
                        logs.append(log)
                    except:
                        continue
        except Exception as e:
            print(f"Error leyendo logs internos: {e}")
        
        return logs
    
    def get_external_logs(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Obtiene logs externos (WordPress).

        Args:
            limit: Número máximo de logs a obtener (None = todos)

        Returns:
            Lista de logs externos con timestamp parseado
        """
        logs = []
        external_log_path = self.get_external_log_path()
        if not external_log_path or not os.path.exists(external_log_path):
            return logs
        
        try:
            with open(external_log_path, "r", encoding="utf-8", errors='ignore') as f:
                lines = f.readlines()
                if limit:
                    lines = lines[-limit:]
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Crear estructura de log para líneas externas
                    log = {
                        'level': 'external',
                        'message': line,
                        'timestamp': datetime.now().isoformat(),
                        'parsed_timestamp': datetime.now(),
                        'source_type': 'SERVIDOR',
                        'source': 'wordpress'
                    }
                    
                    # Intentar extraer timestamp si existe en la línea
                    # Formato común: [2024-01-01 12:00:00] mensaje
                    if line.startswith('[') and ']' in line:
                        try:
                            timestamp_end = line.find(']')
                            timestamp_str = line[1:timestamp_end]
                            parsed_ts = parser.parse(timestamp_str)
                            log['timestamp'] = parsed_ts.isoformat()
                            log['parsed_timestamp'] = parsed_ts
                            log['message'] = line[timestamp_end + 1:].strip()
                        except:
                            pass
                    
                    logs.append(log)
        except Exception as e:
            print(f"Error leyendo logs externos: {e}")
        
        return logs
    
    def merge_logs(self, internal_limit: Optional[int] = None, 
                   external_limit: Optional[int] = None, 
                   sort_by_time: bool = True) -> List[Dict[str, Any]]:
        """
        Combina logs internos y externos.
        
        Args:
            internal_limit: Límite de logs internos (None = todos)
            external_limit: Límite de logs externos (None = todos)
            sort_by_time: Si True, ordena por tiempo. Si False, primero internos luego externos
            
        Returns:
            Lista de logs combinados
        """
        internal_logs = self.get_internal_logs(internal_limit)
        external_logs = self.get_external_logs(external_limit)
        
        if sort_by_time:
            # Combinar y ordenar por timestamp
            all_logs = internal_logs + external_logs
            all_logs.sort(key=lambda x: x.get('parsed_timestamp', datetime.min))
        else:
            # Primero internos, luego externos
            all_logs = internal_logs + external_logs
        
        return all_logs
    
    def format_log_for_merged_file(self, log: Dict[str, Any]) -> str:
        """
        Formatea un log para el archivo merged con cabeceras.
        
        Args:
            log: Diccionario del log
            
        Returns:
            Línea formateada para el archivo
        """
        source_type = log.get('source_type', 'UNKNOWN')
        timestamp = log.get('timestamp', datetime.now().isoformat())
        message = log.get('message', '')
        
        # Formato: [TIMESTAMP] [TIPO] mensaje
        return f"[{timestamp}] [{source_type:>8}] {message}"
    
    def create_merged_file(self, internal_limit: Optional[int] = None,
                          external_limit: Optional[int] = None,
                          sort_by_time: bool = True) -> str:
        """
        Crea el archivo devpipe_merged.log.
        
        Args:
            internal_limit: Límite de logs internos
            external_limit: Límite de logs externos  
            sort_by_time: Si ordenar por tiempo o no
            
        Returns:
            Ruta del archivo creado
        """
        merged_logs = self.merge_logs(internal_limit, external_limit, sort_by_time)
        merged_file_path = self.get_merged_file_path()
        
        # Asegurar que existe el directorio
        os.makedirs(os.path.dirname(merged_file_path), exist_ok=True)
        
        try:
            with open(merged_file_path, 'w', encoding='utf-8') as f:
                for log in merged_logs:
                    formatted_line = self.format_log_for_merged_file(log)
                    f.write(formatted_line + '\n')
        except Exception as e:
            print(f"Error creando archivo merged: {e}")
            raise
        
        return merged_file_path
    
    def get_merged_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas de los archivos de logs.
        
        Returns:
            Diccionario con estadísticas
        """
        stats = {
            'internal_log': {'exists': False, 'size_kb': 0, 'lines': 0},
            'external_log': {'exists': False, 'size_kb': 0, 'lines': 0},
            'merged_log': {'exists': False, 'size_kb': 0, 'lines': 0}
        }
        
        # Estadísticas del log interno
        if self.log_manager:
            internal_file = self.log_manager._get_log_file()
            if os.path.exists(internal_file):
                stats['internal_log']['exists'] = True
                stats['internal_log']['size_kb'] = round(os.path.getsize(internal_file) / 1024, 2)
                try:
                    with open(internal_file, 'r', encoding='utf-8') as f:
                        stats['internal_log']['lines'] = sum(1 for _ in f)
                except:
                    pass
        
        # Estadísticas del log externo
        external_log_path = self.get_external_log_path()
        if external_log_path and os.path.exists(external_log_path):
            stats['external_log']['exists'] = True
            stats['external_log']['size_kb'] = round(os.path.getsize(external_log_path) / 1024, 2)
            try:
                with open(external_log_path, 'r', encoding='utf-8', errors='ignore') as f:
                    stats['external_log']['lines'] = sum(1 for _ in f)
            except:
                pass
        
        # Estadísticas del archivo merged
        merged_file = self.get_merged_file_path()
        if os.path.exists(merged_file):
            stats['merged_log']['exists'] = True
            stats['merged_log']['size_kb'] = round(os.path.getsize(merged_file) / 1024, 2)
            try:
                with open(merged_file, 'r', encoding='utf-8') as f:
                    stats['merged_log']['lines'] = sum(1 for _ in f)
            except:
                pass
        
        return stats
    
    def clear_all_logs(self) -> Dict[str, bool]:
        """
        Borra todos los archivos de logs.
        
        Returns:
            Diccionario con el resultado de cada operación
        """
        results = {
            'internal_cleared': False,
            'external_cleared': False,
            'merged_cleared': False
        }
        
        # Limpiar log interno
        if self.log_manager:
            try:
                self.log_manager.clear_logs()
                results['internal_cleared'] = True
            except:
                pass
        
        # Limpiar log externo
        external_log_path = self.get_external_log_path()
        if external_log_path and os.path.exists(external_log_path):
            try:
                with open(external_log_path, 'w', encoding='utf-8') as f:
                    f.write('')
                results['external_cleared'] = True
            except:
                pass
        
        # Limpiar archivo merged
        merged_file = self.get_merged_file_path()
        if os.path.exists(merged_file):
            try:
                os.remove(merged_file)
                results['merged_cleared'] = True
            except:
                pass
        
        return results
