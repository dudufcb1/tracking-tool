import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MergeIcon } from "lucide-react"

export default function MergeLogs() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MergeIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Merge Logs</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Merge Logs</CardTitle>
          <CardDescription>
            Funcionalidad para combinar y gestionar logs de múltiples fuentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <MergeIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Próximamente</p>
              <p className="text-sm">Esta funcionalidad estará disponible pronto</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
