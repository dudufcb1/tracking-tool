import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GlobeIcon } from "lucide-react"

export default function Globales() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <GlobeIcon className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Globales</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configuración Global</CardTitle>
          <CardDescription>
            Gestiona las configuraciones globales del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <GlobeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Contenido en desarrollo
              </h3>
              <p className="text-gray-500">
                Esta sección estará disponible próximamente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
