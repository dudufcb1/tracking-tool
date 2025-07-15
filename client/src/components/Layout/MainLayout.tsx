import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ReactNode, useMemo, useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const drawerWidth = 240;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [open, setOpen] = useState(true);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
      }),
    [mode]
  );

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <Navbar
          open={open}
          drawerWidth={drawerWidth}
          onDrawerToggle={handleDrawerToggle}
          onThemeToggle={toggleColorMode}
          mode={mode}
        />
        <Sidebar
          open={open}
          drawerWidth={drawerWidth}
          onDrawerToggle={handleDrawerToggle}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            mt: '64px',
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
