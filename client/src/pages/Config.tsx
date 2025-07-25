import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { configApi, monitoringApi, directoryApi, tokenStorage } from '@/lib/api';
import type { DirectoryInfo } from '@/lib/api';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface ConfigFormData {
  maxFileSize: number;    // KB
  maxLogs: number;
  urlFilters: string;     // Como string para el input, se convertirá a array
  port: number;
  logDir: string;
  customLogPath: string;  // Ruta personalizada seleccionada por el usuario
  directoryToken: string; // Token del directorio personalizado
  monitoringEnabled: boolean;
  monitoringInterval: number;
}

interface FileInfo {
  path: string;
  size: number;
  exists: boolean;
  lastModified: string;
}

interface ServerInfo {
  isActive: boolean;
  fileInfo?: FileInfo;
}

export default function Config() {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const { showConfirm, ConfirmDialog } = useConfirmDialog();

  const [formData, setFormData] = useState<ConfigFormData>({
    maxFileSize: 50,          // KB
    maxLogs: 10,
    urlFilters: '',           // Como string, se convertirá a array
    port: 7845,
    logDir: 'logs',
    customLogPath: '',        // Ruta personalizada vacía por defecto
    directoryToken: '',       // Token del directorio personalizado
    monitoringEnabled: false,
    monitoringInterval: 1000
  });

  const [loading, setLoading] = useState(false);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [directoryInfo, setDirectoryInfo] = useState<DirectoryInfo | null>(null);
  const [availableDirectories, setAvailableDirectories] = useState<Array<{ token: string; path: string; info: DirectoryInfo }>>([]);


  // Función para verificar si el botón debe estar deshabilitado
  const isSubmitDisabled = () => {
    // Deshabilitar si está cargando O si el monitoreo está activo
    const disabled = loading || monitoringActive;
    console.log('isSubmitDisabled:', disabled, 'loading:', loading, 'monitoringActive:', monitoringActive);
    return disabled;
  };


  // Función para manejar el cambio manual de directorio (solo actualiza el estado)
  const handleCustomPathChange = (newPath: string) => {
    setFormData(prev => ({ ...prev, customLogPath: newPath }));

    // Si el usuario borra el campo, limpiar el token
    if (!newPath.trim()) {
      if (formData.directoryToken) {
        tokenStorage.removeDirectoryToken();
        setFormData(prev => ({ ...prev, directoryToken: '' }));
      }
    }
  };

  // Función para añadir el directorio (ejecuta la validación y creación de token)
  const handleAddDirectory = async () => {
    const trimmedPath = formData.customLogPath.trim();

    if (!trimmedPath) {
      showError('Por favor ingresa una ruta de directorio');
      return;
    }

    // Validar que parezca una ruta válida (debe empezar con / o contener :\ para Windows)
    const isValidPath = trimmedPath.startsWith('/') || /^[A-Za-z]:\\/.test(trimmedPath);

    if (!isValidPath) {
      showError(
        'Ruta inválida',
        'Por favor ingresa una ruta completa válida (ej: /home/usuario/logs o C:\\Users\\usuario\\logs)'
      );
      return;
    }

    try {
      console.log('Intentando añadir directorio:', trimmedPath);

      const response = await directoryApi.saveDirectory(trimmedPath);
      console.log('Respuesta del servidor:', response);

      if (response.success && response.token && response.info) {
        const { token, info } = response;
        tokenStorage.setDirectoryToken(token);
        setFormData(prev => ({
          ...prev,
          directoryToken: token,
          customLogPath: info.path // Actualizar el campo visual con la ruta real
        }));
        setDirectoryInfo(info);
        showSuccess(
          'Directorio configurado exitosamente',
          `Ruta: ${info.path}`
        );

        // Recargar la lista de directorios disponibles
        loadAvailableDirectories();
      } else {
        showError('Error al configurar el directorio', response.message);
      }
    } catch (error) {
      console.error('Error creating token for manual path:', error);
      showError(
        'Error al comunicarse con el servidor',
        'Verifica que el directorio existe y tienes permisos.'
      );
    }
  };

  // Función para limpiar el directorio personalizado
  const handleClearCustomDirectory = async () => {
    try {
      if (formData.directoryToken) {
        await directoryApi.removeDirectory(formData.directoryToken);
      }
      tokenStorage.removeDirectoryToken();
      setFormData(prev => ({
        ...prev,
        customLogPath: '', // Limpiar el campo visual
        directoryToken: ''
      }));
      setDirectoryInfo(null);
      showSuccess('Directorio personalizado eliminado');
    } catch (error) {
      console.error('Error clearing directory:', error);
      showError('Error al limpiar el directorio');
    }
  };

  // Función para verificar el estado del directorio configurado
  const checkDirectoryStatus = async () => {
    try {
      const token = formData.directoryToken;
      if (!token) return;

      const response = await directoryApi.getDirectoryInfo(token);
      if (response.status === 'success' && response.data) {
        setDirectoryInfo(response.data.info);
        // Actualizar el campo visual con la ruta real
        setFormData(prev => ({
          ...prev,
          customLogPath: response.data?.info.path || ''
        }));
        showInfo(`Estado del directorio actualizado: ${response.data.info.path}`);
      } else {
        showError('No se pudo obtener información del directorio');
      }
    } catch (error) {
      console.error('Error checking directory status:', error);
      showError('Error al verificar el estado del directorio');
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

  // Función para cargar directorios disponibles desde el backend
  const loadAvailableDirectories = async () => {
    try {
      const response = await directoryApi.listDirectories();
      if (response.status === 'success' && response.data) {
        // El servidor ya devuelve un array con la estructura correcta
        setAvailableDirectories(response.data);
      }
    } catch (error) {
      console.error('Error loading available directories:', error);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await configApi.getConfig();

        if (response.status === 'success' && response.data) {
          const config = response.data;
          const savedToken = tokenStorage.getDirectoryToken() || '';

          setFormData({
            maxFileSize: config.maxFileSize,
            maxLogs: config.maxLogs,
            urlFilters: config.urlFilters.join(', '), // Convertir array a string
            port: config.port,
            logDir: config.logDir,
            customLogPath: '',        // Mantener vacío, se llenará cuando el usuario seleccione
            directoryToken: savedToken, // Cargar token guardado
            monitoringEnabled: config.monitoring?.enabled ?? config.monitoringEnabled ?? false,
            monitoringInterval: config.monitoring?.intervalMs ?? config.monitoringInterval ?? 1000
          });



          setServerInfo({
            isActive: config.isActive || false,
            fileInfo: config.fileInfo
          });

          // Actualizar estado del monitoreo
          setMonitoringActive(config.isActive || false);

          // Si hay un token guardado, verificar el estado del directorio
          if (savedToken) {
            try {
              const dirResponse = await directoryApi.getDirectoryInfo(savedToken);
              if (dirResponse.status === 'success' && dirResponse.data) {
                setDirectoryInfo(dirResponse.data.info);
                // Actualizar el campo customLogPath con la ruta real
                setFormData(prev => ({
                  ...prev,
                  customLogPath: dirResponse.data?.info.path || ''
                }));
              }
            } catch (dirError) {
              console.error('Error loading directory info:', dirError);
              // Si hay error con el token, limpiarlo
              tokenStorage.removeDirectoryToken();
              setFormData(prev => ({ ...prev, directoryToken: '' }));
            }
          }
        }
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
        showError('Error al cargar la configuración del servidor');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // Verificar estado del monitoreo
    checkMonitoringStatus();

    // Cargar directorios disponibles
    loadAvailableDirectories();

    // Configurar un intervalo para verificar el estado del monitoreo periódicamente
    const intervalId = setInterval(checkMonitoringStatus, 5000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, []); // Remover showError de las dependencias para evitar loop infinito

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Debug logs
    console.log('handleSubmit - monitoringActive:', monitoringActive);

    // Validación temprana: prevenir envío si el monitoreo está activo
    if (monitoringActive) {
      console.log('Previniendo envío por monitoreo activo');
      showWarning(
        'No se puede cambiar la configuración',
        'El monitoreo está activo. Detén el monitoreo antes de cambiar cualquier configuración.'
      );
      return;
    }

    try {
      setLoading(true);

      // Convertir formData al formato esperado por el servidor
      const configToSend = {
        maxFileSize: formData.maxFileSize,
        maxLogs: formData.maxLogs,
        urlFilters: formData.urlFilters.split(',').map(f => f.trim()).filter(f => f.length > 0),
        port: formData.port,
        logDir: formData.logDir, // Directorio base
        customLogPath: formData.directoryToken, // Enviar el token en lugar de la ruta
        monitoring: {
          enabled: formData.monitoringEnabled,
          intervalMs: formData.monitoringInterval
        }
      };

      const response = await configApi.updateConfig(configToSend);

      if (response.status === 'success') {
        showSuccess('Configuración guardada correctamente');
      } else {
        showError('Error al guardar la configuración', response.message);
      }
    } catch (error) {
      console.error('Error al guardar la configuración:', error);

      // Verificar si es el error específico de monitoreo activo
      if (error instanceof Error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 400) {
        showWarning(
          'No se puede cambiar la configuración',
          'El monitoreo está activo. Detén el monitoreo antes de cambiar la configuración del directorio.'
        );
      } else {
        showError('Error de conexión con el servidor');
      }
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
              <span className="font-medium">{serverInfo.isActive ? 'Monitoreo Activo' : 'Monitoreo Inactivo'}</span>
            </div>
            {serverInfo.fileInfo && (
              <div className="mt-3 text-sm border rounded p-3 bg-muted">
                <p className="font-medium">Información del archivo de log:</p>
                <p className="mt-1"><strong>Ruta:</strong> {serverInfo.fileInfo.path}</p>
                <p><strong>Tamaño:</strong> {(serverInfo.fileInfo.size / 1024).toFixed(2)} KB</p>
                <p><strong>Existe:</strong> {serverInfo.fileInfo.exists ? '✅ Sí' : '❌ No'}</p>
                {serverInfo.fileInfo.lastModified && (
                  <p><strong>Última modificación:</strong> {new Date(serverInfo.fileInfo.lastModified).toLocaleString()}</p>
                )}
                {!serverInfo.fileInfo.exists && serverInfo.isActive && (
                  <p className="text-orange-500 mt-2">
                    ⚠️ El archivo se creará cuando se reciba el primer log
                  </p>
                )}
                {!serverInfo.fileInfo.exists && !serverInfo.isActive && (
                  <p className="text-gray-500 mt-2">
                    💡 El archivo se creará cuando inicies el monitoreo y se reciba el primer log
                  </p>
                )}
              </div>
            )}
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

              {/* Mostrar directorios disponibles */}
              {availableDirectories.length > 0 && (
                <div className="space-y-2">
                  <Label>Directorios configurados en el servidor</Label>
                  <div className="border rounded p-3 bg-muted max-h-32 overflow-y-auto">
                    {availableDirectories.map((dir) => (
                      <div key={dir.token} className="flex items-center justify-between py-1 text-sm">
                        <span className="font-mono text-xs">{dir.path}</span>
                        <div className="flex space-x-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                // Actualizar el frontend
                                tokenStorage.setDirectoryToken(dir.token);
                                setFormData(prev => ({
                                  ...prev,
                                  directoryToken: dir.token,
                                  customLogPath: dir.path
                                }));
                                setDirectoryInfo(dir.info);

                                // Enviar automáticamente al backend para actualizar el LogManager
                                await configApi.updateConfig({
                                  logDir: dir.token
                                });

                                // Recargar la información del servidor para reflejar el cambio
                                const configResponse = await configApi.getConfig();
                                if (configResponse.status === 'success' && configResponse.data) {
                                  setServerInfo({
                                    isActive: configResponse.data.isActive || false,
                                    fileInfo: configResponse.data.fileInfo
                                  });
                                }

                                showSuccess(
                                  'Directorio seleccionado y configurado',
                                  `Ruta: ${dir.path}`
                                );
                              } catch (error) {
                                console.error('Error configurando directorio:', error);
                                showError('Error al configurar el directorio en el servidor');
                              }
                            }}
                            disabled={monitoringActive || formData.directoryToken === dir.token}
                            className="text-xs py-0 h-6"
                          >
                            {formData.directoryToken === dir.token ? 'Activo' : 'Usar'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const confirmed = await showConfirm({
                                title: 'Eliminar directorio',
                                description: `¿Estás seguro de que quieres eliminar el directorio "${dir.path}" de la configuración? Esta acción no se puede deshacer.`,
                                confirmText: 'Eliminar',
                                cancelText: 'Cancelar',
                                variant: 'destructive',
                                icon: 'delete'
                              });

                              if (confirmed) {
                                try {
                                  await directoryApi.removeDirectory(dir.token);
                                  // Si era el directorio activo, limpiarlo
                                  if (formData.directoryToken === dir.token) {
                                    tokenStorage.removeDirectoryToken();
                                    setFormData(prev => ({
                                      ...prev,
                                      directoryToken: '',
                                      customLogPath: ''
                                    }));
                                    setDirectoryInfo(null);
                                  }
                                  // Recargar la lista de directorios
                                  await loadAvailableDirectories();
                                  showSuccess(`Directorio eliminado: ${dir.path}`);
                                } catch (error) {
                                  console.error('Error eliminando directorio:', error);
                                  showError('Error al eliminar el directorio');
                                }
                              }
                            }}
                            disabled={monitoringActive}
                            className="text-xs py-0 h-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    Estos son los directorios configurados en el servidor. Puedes seleccionar uno o configurar uno nuevo abajo.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="customLogPath">Directorio personalizado para esta sesión</Label>
                <div className="flex space-x-2">
                  <Input
                    id="customLogPath"
                    value={formData.customLogPath}
                    onChange={(e) => handleCustomPathChange(e.target.value)}
                    placeholder={
                      formData.directoryToken
                        ? "Directorio configurado"
                        : "Ej: /home/usuario/logs o C:\\Users\\usuario\\logs"
                    }
                    className="flex-1"
                    disabled={monitoringActive || !!formData.directoryToken}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDirectory}
                    disabled={monitoringActive || !!formData.directoryToken || !formData.customLogPath.trim()}
                  >
                    Añadir
                  </Button>
                  {formData.directoryToken && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearCustomDirectory}
                      disabled={monitoringActive}
                      className="text-red-600 hover:text-red-700"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {monitoringActive
                    ? "Debes detener el servicio de monitoreo para cambiar el directorio de logs"
                    : formData.directoryToken
                    ? "Directorio personalizado configurado. Usa el botón 'Limpiar' para cambiarlo."
                    : "Ingresa la ruta completa del directorio donde guardar los logs (ej: /home/usuario/logs o C:\\Users\\usuario\\logs) y haz clic en 'Añadir' para configurarlo."}
                </p>
                {formData.directoryToken && directoryInfo && (
                  <div className="text-xs text-green-600 bg-green-50 p-3 rounded border border-green-200">
                    <div className="font-medium">✅ Directorio configurado correctamente</div>
                    <div className="mt-1">
                      <strong>Ruta:</strong> {directoryInfo.path}
                    </div>
                    <div>
                      <strong>Existe:</strong> {directoryInfo.exists ? '✅ Sí' : '❌ No'}
                    </div>
                    <div>
                      <strong>Permisos de escritura:</strong> {directoryInfo.isWritable ? '✅ Sí' : '❌ No'}
                    </div>

                    {/* Información del archivo de log */}
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <div className="font-medium">📄 Archivo devpipe.log:</div>
                      <div className="mt-1">
                        <strong>Existe:</strong> {directoryInfo.logFile?.exists ? '✅ Sí' : '❌ No'}
                      </div>
                      {directoryInfo.logFile?.exists ? (
                        <>
                          <div>
                            <strong>Tamaño:</strong> {(directoryInfo.logFile.size / 1024).toFixed(2)} KB
                          </div>
                          {directoryInfo.logFile.lastModified && (
                          <div>
                            <strong>Última modificación:</strong> {new Date(directoryInfo.logFile.lastModified).toLocaleString()}
                          </div>
                          )}
                          <div className="text-green-500 text-xs mt-1">
                            🎉 El archivo ya existe y contiene logs
                          </div>
                        </>
                      ) : (
                        <div className="text-blue-500 text-xs mt-1">
                          💡 El archivo se creará cuando inicies el monitoreo y se reciba el primer log
                        </div>
                      )}
                    </div>

                    <div className="text-gray-500 text-xs mt-2">
                      Token: {formData.directoryToken.substring(0, 8)}...
                    </div>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={checkDirectoryStatus}
                        className="text-xs py-0 h-6"
                      >
                        Verificar estado
                      </Button>
                    </div>
                  </div>
                )}
                {formData.directoryToken && !directoryInfo && (
                  <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded border border-orange-200">
                    <div className="font-medium">⚠️ Directorio configurado pero sin información</div>
                    <div className="mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={checkDirectoryStatus}
                        className="text-xs py-0 h-6"
                      >
                        Verificar estado
                      </Button>
                    </div>
                  </div>
                )}
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

            <div className="pt-4 space-y-2">
              {monitoringActive && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  ⚠️ No se puede cambiar la configuración mientras el monitoreo está activo.
                  Detén el monitoreo primero.
                </div>
              )}
              <Button type="submit" disabled={isSubmitDisabled()}>
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Dialog de confirmación */}
      <ConfirmDialog />
    </div>
  );
}
