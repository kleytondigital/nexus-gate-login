import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import CNPJs from "./pages/CNPJs";
import Lojas from "./pages/Lojas";
import DadosMensais from "./pages/DadosMensais";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Index />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute>
                <AppLayout>
                  <Clientes />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/cnpjs" element={
              <ProtectedRoute>
                <AppLayout>
                  <CNPJs />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/lojas" element={
              <ProtectedRoute>
                <AppLayout>
                  <Lojas />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/dados-mensais" element={
              <ProtectedRoute>
                <AppLayout>
                  <DadosMensais />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/gerenciar-usuarios" element={
              <ProtectedRoute>
                <AppLayout>
                  <GerenciarUsuarios />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
