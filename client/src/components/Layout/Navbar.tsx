import { Menu, Sun, Moon, PlayIcon, SquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  open: boolean;
  drawerWidth: number;
  onDrawerToggle: () => void;
  onThemeToggle?: () => void;
  mode?: 'light' | 'dark';
  onStartMonitoring?: () => void;
  onStopMonitoring?: () => void;
  monitoringActive?: boolean;
  monitoringLoading?: boolean;
}

export default function Navbar({
  onDrawerToggle,
  onThemeToggle,
  mode = 'light',
  onStartMonitoring,
  onStopMonitoring,
  monitoringActive = false,
  monitoringLoading = false,
}: NavbarProps) {
  return (
    <nav className={`fixed top-0 left-0 md:left-60 right-0 z-40 h-16 border-b transition-colors duration-300 ${mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="container flex justify-between h-16 items-center px-4">
        <div>
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={onDrawerToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className={`text-lg font-semibold transition-colors duration-300 ${mode === 'dark' ? 'text-white' : 'text-gray-800'}`}>DevPipe Monitor</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botones de monitoreo */}
          {onStartMonitoring && onStopMonitoring && (
            <>
              <Button
                variant={monitoringActive ? "secondary" : "default"}
                size="sm"
                onClick={onStartMonitoring}
                disabled={monitoringLoading || monitoringActive}
              >
                <PlayIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={!monitoringActive ? "secondary" : "destructive"}
                size="sm"
                onClick={onStopMonitoring}
                disabled={monitoringLoading || !monitoringActive}
              >
                <SquareIcon className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Botón de tema */}
          {onThemeToggle && (
            <Button
              variant="ghost"
              className="w-9 px-0"
              onClick={onThemeToggle}
            >
              {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
