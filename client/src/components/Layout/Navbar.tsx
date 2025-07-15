import { Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  open: boolean;
  drawerWidth: number;
  onDrawerToggle: () => void;
  onThemeToggle?: () => void;
  mode?: 'light' | 'dark';
}

export default function Navbar({
  onDrawerToggle,
  onThemeToggle,
  mode = 'light',
}: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 md:left-60 right-0 z-40 bg-white border-b border-gray-200 h-16">
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
          <h1 className="text-lg font-semibold text-gray-800">DevPipe Monitor</h1>
        </div>

        <div>
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
