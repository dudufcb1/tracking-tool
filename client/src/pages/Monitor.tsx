import { useEffect, useState } from "react"
import { useInterval } from "@/lib/hooks"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { logsApi, monitoringApi, type LogEntry } from "@/lib/api"
import { PlayIcon, PauseIcon, SquareIcon, TrashIcon, RefreshCwIcon } from "lucide-react"

type MonitoringState = "stopped" | "running" | "paused";

export default function Monitor() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [monitoringState, setMonitoringState] = useState<MonitoringState>("stopped");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logLimit, setLogLimit] = useState(25);

  const fetchLogs = async () => {
    try {
      setError(null);
      const response = await logsApi.getRecentLogs(logLimit);

      if (response.status === 'success' && response.data) {
        setLogs(response.data);
      } else if (response.status === 'monitoring_disabled') {
        setError('El monitoreo está desactivado en el servidor');
      } else {
        setError(response.message || 'Error al obtener logs');
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setError('Error de conexión con el servidor');
    }
  };

  const toggleMonitoring = async (newState: MonitoringState) => {
    try {
      setLoading(true);
      setError(null);

      switch (newState) {
        case "running":
          const startResponse = await monitoringApi.startMonitoring();
          if (startResponse.status === 'success') {
            setMonitoringState(newState);
          } else {
            setError(startResponse.message || 'Error al iniciar monitoreo');
          }
          break;
        case "stopped":
          const stopResponse = await monitoringApi.stopMonitoring();
          if (stopResponse.status === 'success') {
            setMonitoringState(newState);
          } else {
            setError(stopResponse.message || 'Error al detener monitoreo');
          }
          break;
        case "paused":
          // Para pausar, simplemente cambiamos el estado local
          setMonitoringState(newState);
          break;
      }
    } catch (error) {
      console.error("Error toggling monitoring:", error);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      setLoading(true);
      const response = await logsApi.clearLogs();

      if (response.status === 'success') {
        setLogs([]);
      } else {
        setError(response.message || 'Error al limpiar logs');
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useInterval(fetchLogs, monitoringState === "running" ? 1000 : null);

  // Obtener estado inicial del monitoreo
  useEffect(() => {
    const getInitialStatus = async () => {
      try {
        const statusResponse = await monitoringApi.getStatus();
        if (statusResponse.status === 'success' && statusResponse.data) {
          setMonitoringState(statusResponse.data.isActive ? 'running' : 'stopped');
        }
      } catch (error) {
        console.error('Error getting initial monitoring status:', error);
      }
    };

    getInitialStatus();
    fetchLogs();
  }, [logLimit]);

  const filteredLogs = filter
    ? logs.filter(log =>
        log.message.toLowerCase().includes(filter.toLowerCase()) ||
        log.level.toLowerCase().includes(filter.toLowerCase()) ||
        (log.url && log.url.toLowerCase().includes(filter.toLowerCase())) ||
        (log.source && log.source.toLowerCase().includes(filter.toLowerCase()))
      )
    : logs;

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'external': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Estado y controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Monitor de Logs DevPipe</span>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                monitoringState === 'running' ? 'bg-green-500' :
                monitoringState === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 capitalize">{monitoringState}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Monitor y analiza logs en tiempo real desde el servidor DevPipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controles de monitoreo */}
            <div className="flex items-center gap-2">
              <Button
                variant={monitoringState === "running" ? "secondary" : "default"}
                onClick={() => toggleMonitoring("running")}
                disabled={loading}
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
              <Button
                variant={monitoringState === "paused" ? "secondary" : "default"}
                onClick={() => toggleMonitoring("paused")}
                disabled={loading}
              >
                <PauseIcon className="h-4 w-4 mr-2" />
                Pausar
              </Button>
              <Button
                variant={monitoringState === "stopped" ? "secondary" : "default"}
                onClick={() => toggleMonitoring("stopped")}
                disabled={loading}
              >
                <SquareIcon className="h-4 w-4 mr-2" />
                Detener
              </Button>

              <Separator orientation="vertical" className="h-8" />

              <Button
                variant="outline"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Actualizar
              </Button>

              <Button
                variant="outline"
                onClick={clearLogs}
                disabled={loading}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>

            {/* Configuración */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="logLimit">Límite:</Label>
                <Input
                  id="logLimit"
                  type="number"
                  value={logLimit}
                  onChange={(e) => setLogLimit(parseInt(e.target.value) || 25)}
                  className="w-20"
                  min="1"
                  max="100"
                />
              </div>

              <div className="flex-1">
                <Label htmlFor="filter">Filtrar logs:</Label>
                <Input
                  id="filter"
                  placeholder="Buscar en mensaje, nivel, URL o fuente..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensajes de error */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Lista de logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Logs Recientes ({filteredLogs.length} de {logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] overflow-auto rounded-md border bg-gray-50 p-4">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                {logs.length === 0 ? 'No hay logs disponibles' : 'No hay logs que coincidan con el filtro'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log, index) => (
                  <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
                    <div className="flex items-start justify-between text-xs text-gray-500 mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        {log.source && (
                          <span className="bg-gray-200 px-1 rounded">
                            {log.source}
                          </span>
                        )}
                      </div>
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap">
                      {log.message}
                    </div>
                    {log.url && (
                      <div className="text-xs text-blue-600 mt-1">
                        {log.url}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
