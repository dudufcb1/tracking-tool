import { Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

interface NavbarProps {
  open: boolean;
  drawerWidth: number;
  onDrawerToggle: () => void;
  onThemeToggle: () => void;
  mode: 'light' | 'dark';
}

export default function Navbar({
  open,
  drawerWidth,
  onDrawerToggle,
  onThemeToggle,
  mode,
}: NavbarProps) {
  return (
    <NavigationMenu
      className="fixed top-0 right-0 w-full z-50 bg-background border-b"
      style={{
        width: `calc(100% - ${open ? drawerWidth : 0}px)`,
        marginLeft: open ? `${drawerWidth}px` : 0,
        transition: 'width 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms, margin 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
      }}
    >
      <NavigationMenuList className="container flex justify-between h-16 items-center">
        <NavigationMenuItem>
          <Button
            variant="ghost"
            className="md:hidden"
            onClick={onDrawerToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </NavigationMenuItem>
        <NavigationMenuItem className="flex-1">
          <h1 className="text-lg font-semibold">DevPipe Monitor</h1>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Button
            variant="ghost"
            className="w-9 px-0"
            onClick={onThemeToggle}
          >
            {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
