import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  MergeIcon,
  RefreshCwIcon,
  TrashIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  ServerIcon,
  MonitorIcon
} from "lucide-react"
import { mergeLogsApi, mergeConfigApi } from "@/lib/api"
import { toast } from "sonner"

interface MergeStats {
  internal_log: { exists: boolean; size_kb: number; lines: number };
  external_log: { exists: boolean; size_kb: number; lines: number };
  merged_log: { exists: boolean; size_kb: number; lines: number };
}

export default function MergeLogs() {
  const [stats, setStats] = useState<MergeStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [internalLines, setInternalLines] = useState<string>("")
  const [externalLines, setExternalLines] = useState<string>("")
  const [sortByTime, setSortByTime] = useState(true)
  const [exportContent, setExportContent] = useState<string>("")
  const [showExportContent, setShowExportContent] = useState(false)
  const [externalLogPath, setExternalLogPath] = useState<string>("")
  const [mergedLogPath, setMergedLogPath] = useState<string>("")
  const [showConfig, setShowConfig] = useState(false)

  // Función para formatear el tamaño del archivo
  const formatFileSize = (sizeKb: number): string => {
    if (sizeKb === 0) return '0 KB'
    if (sizeKb < 1024) return `${sizeKb.toFixed(2)} KB`
    return `${(sizeKb / 1024).toFixed(2)} MB`
  }

  // Función para cargar configuraciones de rutas
  const loadPaths = async () => {
    try {
      const [externalResponse, mergedResponse] = await Promise.all([
        mergeConfigApi.getExternalLogPath(),
        mergeConfigApi.getMergedLogPath()
      ])

      if (externalResponse.status === 'success' && externalResponse.data) {
        setExternalLogPath(externalResponse.data.path)
      }

      if (mergedResponse.status === 'success' && mergedResponse.data) {
        setMergedLogPath(mergedResponse.data.path)
      }
    } catch (error) {
      console.error("Error loading paths:", error)
    }
  }

  // Función para cargar estadísticas
  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await mergeLogsApi.getStats()
      if (response.status === 'success' && response.data) {
        setStats(response.data)
      } else {
        toast.error("Error al cargar estadísticas")
      }
    } catch (error) {
      console.error("Error loading stats:", error)
      toast.error("Error al cargar estadísticas")
    } finally {
      setLoading(false)
    }
  }

  // Función para guardar ruta externa
  const saveExternalPath = async () => {
    if (!externalLogPath.trim()) {
      toast.error("Por favor ingresa una ruta válida")
      return
    }

    setLoading(true)
    try {
      const response = await mergeConfigApi.setExternalLogPath(externalLogPath)
      if (response.status === 'success') {
        toast.success("Ruta externa guardada correctamente")
        await loadStats() // Recargar estadísticas
      } else {
        toast.error("Error al guardar la ruta externa")
      }
    } catch (error) {
      console.error("Error saving external path:", error)
      toast.error("Error al guardar la ruta externa")
    } finally {
      setLoading(false)
    }
  }

  // Función para guardar ruta merged
  const saveMergedPath = async () => {
    if (!mergedLogPath.trim()) {
      toast.error("Por favor ingresa una ruta válida")
      return
    }

    setLoading(true)
    try {
      const response = await mergeConfigApi.setMergedLogPath(mergedLogPath)
      if (response.status === 'success') {
        toast.success("Ruta merged guardada correctamente")
        await loadStats() // Recargar estadísticas
      } else {
        toast.error("Error al guardar la ruta merged")
      }
    } catch (error) {
      console.error("Error saving merged path:", error)
      toast.error("Error al guardar la ruta merged")
    } finally {
      setLoading(false)
    }
  }

  // Función para borrar todos los logs
  const clearAllLogs = async () => {
    setLoading(true)
    try {
      const response = await mergeLogsApi.clearAllLogs()
      if (response.status === 'success') {
        toast.success("Todos los logs han sido borrados")
        await loadStats()
      } else {
        toast.error("Error al borrar los logs")
      }
    } catch (error) {
      console.error("Error clearing logs:", error)
      toast.error("Error al borrar los logs")
    } finally {
      setLoading(false)
    }
  }

  // Función para exportar logs al portapapeles
  const exportToClipboard = async () => {
    setLoading(true)
    try {
      const options: any = {
        sort_by_time: sortByTime
      }

      if (internalLines && internalLines !== "") {
        options.js = parseInt(internalLines)
      }

      if (externalLines && externalLines !== "") {
        options.wp = parseInt(externalLines)
      }

      const response = await mergeLogsApi.exportLogs(options)
      if (response.status === 'success' && response.data) {
        setExportContent(response.data.content)
        setShowExportContent(true)

        // Copiar al portapapeles
        await navigator.clipboard.writeText(response.data.content)
        toast.success(`${response.data.total_lines} líneas copiadas al portapapeles`)
      } else {
        toast.error("Error al exportar logs")
      }
    } catch (error) {
      console.error("Error exporting logs:", error)
      toast.error("Error al exportar logs")
    } finally {
      setLoading(false)
    }
  }

  // Función para crear archivo merged
  const createMergedFile = async () => {
    setLoading(true)
    try {
      const options: any = {
        sort_by_time: sortByTime
      }

      if (internalLines && internalLines !== "") {
        options.internal_limit = parseInt(internalLines)
      }

      if (externalLines && externalLines !== "") {
        options.external_limit = parseInt(externalLines)
      }

      const response = await mergeLogsApi.createMergedFile(options)
      if (response.status === 'success' && response.data) {
        toast.success(`Archivo merged creado correctamente en: ${response.data.file_path}`)
        await loadStats() // Recargar estadísticas para mostrar el archivo creado
      } else {
        toast.error("Error al crear el archivo merged")
      }
    } catch (error) {
      console.error("Error creating merged file:", error)
      toast.error("Error al crear el archivo merged")
    } finally {
      setLoading(false)
    }
  }

  // Cargar estadísticas y rutas al montar el componente
  useEffect(() => {
    loadStats()
    loadPaths()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MergeIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Merge Logs</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStats}
          disabled={loading}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs Consola (JS)</CardTitle>
            <MonitorIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.internal_log.exists ? (
                <Badge variant="default">Activo</Badge>
              ) : (
                <Badge variant="secondary">Sin datos</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${formatFileSize(stats.internal_log.size_kb)} • ${stats.internal_log.lines} líneas` : 'Cargando...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs Servidor (WP)</CardTitle>
            <ServerIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.external_log.exists ? (
                <Badge variant="default">Activo</Badge>
              ) : (
                <Badge variant="secondary">Sin datos</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${formatFileSize(stats.external_log.size_kb)} • ${stats.external_log.lines} líneas` : 'Cargando...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archivo Merged</CardTitle>
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.merged_log.exists ? (
                <Badge variant="default">Disponible</Badge>
              ) : (
                <Badge variant="outline">No creado</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${formatFileSize(stats.merged_log.size_kb)} • ${stats.merged_log.lines} líneas` : 'Cargando...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuración de Rutas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuración de Rutas</CardTitle>
              <CardDescription>
                Configura las rutas de los archivos de logs externos y merged
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? 'Ocultar' : 'Mostrar'} Configuración
            </Button>
          </div>
        </CardHeader>
        {showConfig && (
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="external-path">Ruta del Archivo Externo (WordPress)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="external-path"
                    type="text"
                    placeholder="/ruta/al/archivo/wordpress.log"
                    value={externalLogPath}
                    onChange={(e) => setExternalLogPath(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={saveExternalPath}
                    disabled={loading}
                    size="sm"
                  >
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ruta completa al archivo de logs de WordPress o servidor externo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="merged-path">Ruta del Archivo Merged</Label>
                <div className="flex space-x-2">
                  <Input
                    id="merged-path"
                    type="text"
                    placeholder="logs/devpipe_merged.log"
                    value={mergedLogPath}
                    onChange={(e) => setMergedLogPath(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={saveMergedPath}
                    disabled={loading}
                    size="sm"
                  >
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ruta donde se guardará el archivo combinado devpipe_merged.log
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Configuración de Merge */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Merge</CardTitle>
          <CardDescription>
            Configura cuántas líneas incluir de cada archivo y el orden de los logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="internal-lines">Líneas de Consola (JS)</Label>
              <Input
                id="internal-lines"
                type="number"
                placeholder="Todo el archivo"
                value={internalLines}
                onChange={(e) => setInternalLines(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Dejar vacío para incluir todo el archivo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="external-lines">Líneas de Servidor (WP)</Label>
              <Input
                id="external-lines"
                type="number"
                placeholder="Todo el archivo"
                value={externalLines}
                onChange={(e) => setExternalLines(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Dejar vacío para incluir todo el archivo
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center space-x-2">
            <Switch
              id="sort-by-time"
              checked={sortByTime}
              onCheckedChange={setSortByTime}
            />
            <Label htmlFor="sort-by-time">
              Ordenar por tiempo (intercalados)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {sortByTime
              ? "Los logs se ordenarán por timestamp, intercalando consola y servidor"
              : "Primero todos los logs de consola, luego todos los de servidor"
            }
          </p>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
          <CardDescription>
            Gestiona y exporta los logs combinados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={exportToClipboard}
              disabled={loading}
              className="flex-1 min-w-[200px]"
            >
              <CopyIcon className="h-4 w-4 mr-2" />
              Exportar al Portapapeles
            </Button>

            <Button
              onClick={createMergedFile}
              disabled={loading}
              variant="outline"
              className="flex-1 min-w-[200px]"
            >
              <FileTextIcon className="h-4 w-4 mr-2" />
              Crear Archivo Merged
            </Button>

            <Button
              variant="destructive"
              onClick={clearAllLogs}
              disabled={loading}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Borrar Todos los Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contenido exportado */}
      {showExportContent && exportContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Contenido Exportado</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportContent(false)}
              >
                Ocultar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {exportContent}
              </pre>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(exportContent)}
              >
                <CopyIcon className="h-4 w-4 mr-2" />
                Copiar de nuevo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
