import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MonitorIcon, SettingsIcon, GlobeIcon, MergeIcon } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  drawerWidth: number;
  onDrawerToggle: () => void;
  mode?: 'light' | 'dark';
}

export default function Sidebar({
  open,
  drawerWidth,
  onDrawerToggle,
  mode = 'light',
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Monitor', icon: MonitorIcon, path: '/' },
    { text: 'Configuración', icon: SettingsIcon, path: '/config' },
    { text: 'Globales', icon: GlobeIcon, path: '/globales' },
    { text: 'Merge Logs', icon: MergeIcon, path: '/merge-logs' },
  ];

  const sidebarContent = (
    <div className="p-4 space-y-2">
      <div className="mb-6">
        <h2 className={`text-lg font-semibold ${mode === 'dark' ? 'text-white' : 'text-gray-800'}`}>DevPipe</h2>
        <p className={`text-sm ${mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Monitor de Logs</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Button
              key={item.text}
              variant={isActive ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                navigate(item.path);
                onDrawerToggle();
              }}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.text}
            </Button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onDrawerToggle}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`
        fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out md:hidden
        ${open ? 'translate-x-0' : '-translate-x-full'}
        ${mode === 'dark' ? 'bg-gray-800' : 'bg-white'}
      `} style={{ width: drawerWidth }}>
        <Card className={`h-full rounded-none border-r ${mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-0">
            {sidebarContent}
          </CardContent>
        </Card>
      </div>

      {/* Desktop sidebar - fijo en la izquierda */}
      <div
        className={`hidden md:block fixed top-0 left-0 h-full z-30 border-r ${mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        style={{ width: drawerWidth }}
      >
        <div className="h-full overflow-y-auto">
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
