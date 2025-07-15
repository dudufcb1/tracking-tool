import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/Layout/MainLayout';
import Monitor from './pages/Monitor';
import Config from './pages/Config';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Monitor />} />
            <Route path="/config" element={<Config />} />
          </Routes>
        </MainLayout>
      </Router>
    </QueryClientProvider>
  )
}

export default App
