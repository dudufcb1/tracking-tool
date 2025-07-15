from dataclasses import dataclass
from typing import Dict, Optional, Union

@dataclass
class LogEntry:
    """Estructura de un log."""
    level: str
    message: str
    url: str
    timestamp: str
    user_agent: str
    stack_trace: Optional[str] = None
    additional_data: Optional[Dict[str, Union[str, int, float, bool]]] = None
    server_timestamp: Optional[str] = None
