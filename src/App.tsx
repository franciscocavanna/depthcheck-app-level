import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Prioridad from "./pages/Prioridad";
import Clientes from "./pages/Clientes";
import Pagos from "./pages/Pagos";
import Playbooks from "./pages/Playbooks";
import Promesas from "./pages/Promesas";
import Importar from "./pages/Importar";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/prioridad" element={<Prioridad />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/pagos" element={<Pagos />} />
          <Route path="/playbooks" element={<Playbooks />} />
          <Route path="/promesas" element={<Promesas />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
