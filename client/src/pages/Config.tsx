import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { configApi } from '@/lib/api';
import { Separator } from '@/components/ui/separator';

interface ConfigFormData {
  logPath: string;
  maxFileSize: number;
  maxBufferSize: number;
  rotationCount: number;
}

export default function Config() {
  const [formData, setFormData] = useState<ConfigFormData>({
    logPath: '',
    maxFileSize: 1024 * 1024, // 1MB por defecto
    maxBufferSize: 1000,      // 1000 líneas por defecto
    rotationCount: 5          // 5 archivos de respaldo por defecto
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await configApi.getConfig();
        setFormData(data);
      } catch (error) {
        console.error('Error al cargar la configuración:', error);
      }
    };

    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configApi.updateConfig(formData);
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Ajusta la configuración del monitor de logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="logPath">Ruta del archivo de log</Label>
            <Input
              id="logPath"
              value={formData.logPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, logPath: e.target.value }))}
              placeholder="/ruta/al/archivo.log"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Tamaño máximo del archivo (bytes)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={formData.maxFileSize}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="maxBufferSize">Tamaño máximo del buffer (líneas)</Label>
            <Input
              id="maxBufferSize"
              type="number"
              value={formData.maxBufferSize}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, maxBufferSize: parseInt(e.target.value) }))}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="rotationCount">Número de archivos de respaldo</Label>
            <Input
              id="rotationCount"
              type="number"
              value={formData.rotationCount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, rotationCount: parseInt(e.target.value) }))}
            />
          </div>
          <div className="pt-4">
            <Button type="submit">Guardar cambios</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
