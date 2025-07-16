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
import {
  GlobeIcon,
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  TrashIcon,
  DownloadIcon,
  EyeIcon
} from "lucide-react"
import { externalLogApi, mergeConfigApi } from "@/lib/api"
import { toast } from "sonner"

interface FileStats {
  path: string;
  size_bytes: number;
}

interface FileExistence {
  exists: boolean;
  path: string;
}

export default function Globales() {
  const [filePath, setFilePath] = useState("")
  const [fileExists, setFileExists] = useState<boolean | null>(null)
  const [fileStats, setFileStats] = useState<FileStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastNLines, setLastNLines] = useState(10)
  const [fileContent, setFileContent] = useState<string[]>([])
  const [showContent, setShowContent] = useState(false)

  // Función para formatear el tamaño del archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Función para establecer la ruta del archivo
  const handleSetPath = async () => {
    if (!filePath.trim()) {
      toast.error("Por favor, ingresa una ruta de archivo válida")
      return
    }

    setLoading(true)
    try {
      const response = await mergeConfigApi.setExternalLogPath(filePath.trim())
      if (response.status === 'success') {
        toast.success("Ruta del archivo establecida correctamente")
        await checkFileExists()
        await getFileStats()
      } else {
        toast.error("Error al establecer la ruta del archivo")
      }
    } catch (error) {
      console.error("Error setting file path:", error)
      toast.error("Error al establecer la ruta del archivo")
    } finally {
      setLoading(false)
    }
  }

  // Función para verificar si el archivo existe
  const checkFileExists = async () => {
    setLoading(true)
    try {
      const response = await mergeConfigApi.getExternalLogPath()
      if (response.status === 'success' && response.data) {
        setFileExists(response.data.exists)
        if (response.data.path) {
          setFilePath(response.data.path)
        }
      } else {
        setFileExists(false)
        setFilePath("")
      }
    } catch (error: any) {
      console.error("Error checking file existence:", error)
      setFileExists(false)
      setFilePath("")
      // Solo mostrar error si es un error real, no por falta de configuración
      if (error?.response?.status !== 400) {
        toast.error("Error al verificar la existencia del archivo")
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener estadísticas del archivo
  const getFileStats = async () => {
    if (!filePath) {
      setFileStats(null)
      return
    }

    setLoading(true)
    try {
      const stats: FileStats = await externalLogApi.getStats()
      setFileStats(stats)
    } catch (error: any) {
      console.error("Error getting file stats:", error)
      setFileStats(null)
      // Solo mostrar error si no es por falta de ruta establecida
      if (error?.response?.status !== 400) {
        toast.error("Error al obtener estadísticas del archivo")
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener las últimas N líneas
  const getLastLines = async () => {
    setLoading(true)
    try {
      const response = await externalLogApi.getLastNLines(lastNLines)
      setFileContent(response.lines)
      setShowContent(true)
      toast.success(`Se obtuvieron las últimas ${response.lines.length} líneas`)
    } catch (error) {
      console.error("Error getting last lines:", error)
      toast.error("Error al obtener las últimas líneas")
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener todo el contenido
  const getAllContent = async () => {
    setLoading(true)
    try {
      const response = await externalLogApi.getContent()
      const lines = response.content.split('\n').filter(line => line.trim())
      setFileContent(lines)
      setShowContent(true)
      toast.success(`Se obtuvo todo el contenido (${lines.length} líneas)`)
    } catch (error) {
      console.error("Error getting all content:", error)
      toast.error("Error al obtener el contenido completo")
    } finally {
      setLoading(false)
    }
  }

  // Función para limpiar el archivo
  const clearFile = async () => {
    if (!window.confirm("¿Estás seguro de que quieres borrar el contenido del archivo?")) {
      return
    }

    setLoading(true)
    try {
      await externalLogApi.clear()
      toast.success("Contenido del archivo borrado correctamente")
      await getFileStats() // Actualizar estadísticas
      setFileContent([])
      setShowContent(false)
    } catch (error) {
      console.error("Error clearing file:", error)
      toast.error("Error al borrar el contenido del archivo")
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    checkFileExists()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <GlobeIcon className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Logs Globales</h1>
      </div>

      {/* Configuración del archivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileTextIcon className="h-5 w-5" />
            <span>Configuración de Archivo Externo</span>
          </CardTitle>
          <CardDescription>
            Especifica la ruta del archivo de log externo que deseas monitorear (ej: logs de WordPress)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="filePath">Ruta del archivo de log</Label>
              <Input
                id="filePath"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/var/www/html/wp-content/debug.log"
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSetPath}
                disabled={loading || !filePath.trim()}
              >
                Establecer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>Estado del Archivo</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                checkFileExists()
                getFileStats()
              }}
              disabled={loading}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Label>Estado:</Label>
              {fileExists === null ? (
                <Badge variant="secondary">Verificando...</Badge>
              ) : fileExists ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Existe
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircleIcon className="h-3 w-3 mr-1" />
                  No existe
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Label>Tamaño:</Label>
              <span className="text-sm font-mono">
                {fileStats ? formatFileSize(fileStats.size_bytes) : 'N/A'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Label>Ruta:</Label>
              <span className="text-xs font-mono text-gray-600 truncate max-w-48">
                {fileStats?.path || filePath || 'No establecida'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles de manipulación */}
      <Card>
        <CardHeader>
          <CardTitle>Operaciones del Archivo</CardTitle>
          <CardDescription>
            Manipula el contenido del archivo de log externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Obtener últimas N líneas */}
            <div className="space-y-2">
              <Label htmlFor="lastNLines">Últimas N líneas</Label>
              <div className="flex space-x-2">
                <Input
                  id="lastNLines"
                  type="number"
                  value={lastNLines}
                  onChange={(e) => setLastNLines(parseInt(e.target.value) || 10)}
                  min="1"
                  max="1000"
                  className="w-20"
                  disabled={loading}
                />
                <Button
                  onClick={getLastLines}
                  disabled={loading || !fileExists}
                  variant="outline"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Ver últimas
                </Button>
              </div>
            </div>

            {/* Obtener todo el contenido */}
            <div className="space-y-2">
              <Label>Contenido completo</Label>
              <Button
                onClick={getAllContent}
                disabled={loading || !fileExists}
                variant="outline"
                className="w-full"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Obtener todo
              </Button>
            </div>
          </div>

          <Separator />

          {/* Limpiar archivo */}
          <div className="space-y-2">
            <Label>Operaciones destructivas</Label>
            <Button
              onClick={clearFile}
              disabled={loading || !fileExists}
              variant="destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Borrar contenido del archivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mostrar contenido */}
      {showContent && fileContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Contenido del Archivo ({fileContent.length} líneas)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContent(false)}
              >
                Ocultar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {fileContent.map((line, index) => (
                  <div key={index} className="border-b border-gray-200 py-1">
                    <span className="text-gray-400 mr-4">{index + 1}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
