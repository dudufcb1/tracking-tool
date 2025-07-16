import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { monitoringApi } from '@/lib/api';
import { toast } from 'sonner';

const drawerWidth = 240;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Verificar estado del monitoreo al cargar
  useEffect(() => {
    const checkMonitoringStatus = async () => {
      try {
        const response = await monitoringApi.getStatus();
        if (response.status === 'success' && response.data) {
          setMonitoringActive(response.data.isActive);
        }
      } catch (error) {
        console.error('Error checking monitoring status:', error);
      }
    };

    checkMonitoringStatus();
  }, []);

  const handleStartMonitoring = async () => {
    setMonitoringLoading(true);
    try {
      const response = await monitoringApi.startMonitoring();
      if (response.status === 'success') {
        setMonitoringActive(true);
        toast.success('Monitoreo iniciado');
      } else {
        toast.error('Error al iniciar monitoreo');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      toast.error('Error de conexión');
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setMonitoringLoading(true);
    try {
      const response = await monitoringApi.stopMonitoring();
      if (response.status === 'success') {
        setMonitoringActive(false);
        toast.success('Monitoreo detenido');
      } else {
        toast.error('Error al detener monitoreo');
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      toast.error('Error de conexión');
    } finally {
      setMonitoringLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${mode === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navbar fijo en la parte superior */}
      <Navbar
        open={sidebarOpen}
        drawerWidth={drawerWidth}
        onDrawerToggle={handleDrawerToggle}
        onThemeToggle={toggleColorMode}
        mode={mode}
        onStartMonitoring={handleStartMonitoring}
        onStopMonitoring={handleStopMonitoring}
        monitoringActive={monitoringActive}
        monitoringLoading={monitoringLoading}
      />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        drawerWidth={drawerWidth}
        onDrawerToggle={handleDrawerToggle}
        mode={mode}
      />

      {/* Contenido principal con margen apropiado */}
      <main className={`pt-16 md:ml-60 transition-all duration-300 min-h-screen ${mode === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
