import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { configApi, monitoringApi } from '@/lib/api';
import { Separator } from '@/components/ui/separator';

interface ConfigFormData {
  maxFileSize: number;    // KB
  maxLogs: number;
  urlFilters: string;     // Como string para el input, se convertirá a array
  port: number;
  logDir: string;
  customLogPath: string;  // Ruta personalizada seleccionada por el usuario
  monitoringEnabled: boolean;
  monitoringInterval: number;
}

export default function Config() {
  const [formData, setFormData] = useState<ConfigFormData>({
    maxFileSize: 50,          // KB
    maxLogs: 10,
    urlFilters: '',           // Como string, se convertirá a array
    port: 7845,
    logDir: 'logs',
    customLogPath: '',        // Ruta personalizada vacía por defecto
    monitoringEnabled: false,
    monitoringInterval: 1000
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [serverInfo, setServerInfo] = useState<{ isActive: boolean, fileInfo?: any } | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);

  // Función para manejar la selección de directorio
  const handleDirectorySelect = async () => {
    try {
      // Usar la API de File System Access (moderna)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        setFormData(prev => ({ ...prev, customLogPath: dirHandle.name }));
        setMessage({ type: 'success', text: `Directorio seleccionado: ${dirHandle.name}` });
      } else {
        // Fallback para navegadores que no soportan File System Access API
        setMessage({ type: 'error', text: 'Tu navegador no soporta selección de directorios. Usa el campo de texto.' });
      }
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        setMessage({ type: 'error', text: 'Error al seleccionar directorio' });
      }
    }
  };

  // Función para obtener el estado del monitoreo
  const checkMonitoringStatus = async () => {
    try {
      const statusResponse = await monitoringApi.getStatus();
      if (statusResponse.status === 'success' && statusResponse.data) {
        setMonitoringActive(statusResponse.data.isActive);
      }
    } catch (error) {
      console.error('Error getting monitoring status:', error);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await configApi.getConfig();

        if (response.status === 'success' && response.data) {
          const config = response.data;
          setFormData({
            maxFileSize: config.maxFileSize,
            maxLogs: config.maxLogs,
            urlFilters: config.urlFilters.join(', '), // Convertir array a string
            port: config.port,
            logDir: config.logDir,
            customLogPath: '',        // Mantener vacío, se llenará cuando el usuario seleccione
            monitoringEnabled: config.monitoring.enabled,
            monitoringInterval: config.monitoring.intervalMs
          });

          setServerInfo({
            isActive: config.isActive || false,
            fileInfo: config.fileInfo
          });

          // Actualizar estado del monitoreo
          setMonitoringActive(config.isActive || false);
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
        setMessage({ type: 'error', text: 'Error al cargar la configuración del servidor' });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // Verificar estado del monitoreo
    checkMonitoringStatus();

    // Configurar un intervalo para verificar el estado del monitoreo periódicamente
    const intervalId = setInterval(checkMonitoringStatus, 5000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage(null);

      // Convertir formData al formato esperado por el servidor
      const configToSend = {
        maxFileSize: formData.maxFileSize,
        maxLogs: formData.maxLogs,
        urlFilters: formData.urlFilters.split(',').map(f => f.trim()).filter(f => f.length > 0),
        port: formData.port,
        logDir: formData.customLogPath || formData.logDir, // Usar directorio personalizado si está disponible
        monitoring: {
          enabled: formData.monitoringEnabled,
          intervalMs: formData.monitoringInterval
        }
      };

      const response = await configApi.updateConfig(configToSend);

      if (response.status === 'success') {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      } else {
        setMessage({ type: 'error', text: response.message || 'Error al guardar la configuración' });
      }
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estado del servidor */}
      {serverInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Estado del Servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${serverInfo.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{serverInfo.isActive ? 'Monitoreo Activo' : 'Monitoreo Inactivo'}</span>
            </div>
            {serverInfo.fileInfo && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Archivo: {serverInfo.fileInfo.path}</p>
                <p>Tamaño: {(serverInfo.fileInfo.size / 1024).toFixed(2)} KB</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensajes */}
      {message && (
        <Card className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <CardContent className="pt-6">
            <p className={message.type === 'error' ? 'text-red-600' : 'text-green-600'}>
              {message.text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Estado del servicio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Estado del Servicio</span>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                monitoringActive ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                {monitoringActive ? 'Monitoreo Activo' : 'Monitoreo Detenido'}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            {monitoringActive
              ? "El servicio de monitoreo está activo. Algunas configuraciones no se pueden cambiar."
              : "El servicio de monitoreo está detenido. Puedes cambiar todas las configuraciones."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Formulario de configuración */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
            <CardDescription>
              Ajusta la configuración del monitor de logs DevPipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuración de archivos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Archivos y Logs</h3>

              <div className="space-y-2">
                <Label htmlFor="logDir">Directorio de logs (por defecto)</Label>
                <Input
                  id="logDir"
                  value={formData.logDir}
                  onChange={(e) => setFormData(prev => ({ ...prev, logDir: e.target.value }))}
                  placeholder="logs"
                />
                <p className="text-sm text-gray-500">
                  Directorio por defecto donde se guardarán los logs
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customLogPath">Directorio personalizado para esta sesión</Label>
                <div className="flex space-x-2">
                  <Input
                    id="customLogPath"
                    value={formData.customLogPath}
                    onChange={(e) => setFormData(prev => ({ ...prev, customLogPath: e.target.value }))}
                    placeholder="Selecciona un directorio o escribe la ruta..."
                    className="flex-1"
                    disabled={monitoringActive}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDirectorySelect}
                    disabled={monitoringActive}
                  >
                    Examinar
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  {monitoringActive
                    ? "Debes detener el servicio de monitoreo para cambiar el directorio de logs"
                    : "Selecciona un directorio específico donde guardar los logs de esta sesión"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Tamaño máximo del archivo (KB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={formData.maxFileSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLogs">Número máximo de logs a mostrar</Label>
                <Input
                  id="maxLogs"
                  type="number"
                  value={formData.maxLogs}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxLogs: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <Separator />

            {/* Configuración de red */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Red y Puerto</h3>

              <div className="space-y-2">
                <Label htmlFor="port">Puerto del servidor</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 7845 }))}
                />
                <p className="text-sm text-gray-500">
                  Puerto donde el servidor DevPipe escuchará las conexiones
                </p>
              </div>
            </div>

            <Separator />

            {/* Configuración de filtros */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Filtros</h3>

              <div className="space-y-2">
                <Label htmlFor="urlFilters">Filtros de URL (separados por comas)</Label>
                <Input
                  id="urlFilters"
                  value={formData.urlFilters}
                  onChange={(e) => setFormData(prev => ({ ...prev, urlFilters: e.target.value }))}
                  placeholder="localhost, 127.0.0.1, example.com"
                />
                <p className="text-sm text-gray-500">
                  URLs que serán filtradas del monitoreo
                </p>
              </div>
            </div>

            <Separator />

            {/* Configuración de monitoreo */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Monitoreo</h3>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="monitoringEnabled"
                  checked={formData.monitoringEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, monitoringEnabled: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="monitoringEnabled">Habilitar monitoreo automático</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monitoringInterval">Intervalo de monitoreo (ms)</Label>
                <Input
                  id="monitoringInterval"
                  type="number"
                  value={formData.monitoringInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, monitoringInterval: parseInt(e.target.value) || 1000 }))}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
