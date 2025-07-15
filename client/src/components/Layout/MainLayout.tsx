import { useState } from 'react';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const drawerWidth = 240;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${mode === 'dark' ? 'dark' : ''}`}>
      {/* Navbar fijo en la parte superior */}
      <Navbar
        open={sidebarOpen}
        drawerWidth={drawerWidth}
        onDrawerToggle={handleDrawerToggle}
        onThemeToggle={toggleColorMode}
        mode={mode}
      />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        drawerWidth={drawerWidth}
        onDrawerToggle={handleDrawerToggle}
      />

      {/* Contenido principal con margen apropiado */}
      <main className="pt-16 md:ml-60 transition-all duration-300 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
