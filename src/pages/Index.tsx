import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-6">
            <BarChart3 className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold">B2X Analytics</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Sistema completo de relatórios analíticos para gestão de marketplaces
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Fazer Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">Criar Conta</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Gestão de Clientes</CardTitle>
              <CardDescription>
                Organize clientes, CNPJs e lojas em uma interface intuitiva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Múltiplos CNPJs por cliente</li>
                <li>• Lojas por marketplace</li>
                <li>• Controle de acesso seguro</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Analytics Avançados</CardTitle>
              <CardDescription>
                Cálculos automáticos de ROAS, ACOS e métricas de performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• ROAS calculado automaticamente</li>
                <li>• Análise por período</li>
                <li>• Comparativo entre marketplaces</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Building2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Multi-Marketplace</CardTitle>
              <CardDescription>
                Suporte para Shopee, Mercado Livre, TikTok Shop, Shein e mais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Dados centralizados</li>
                <li>• Relatórios exportáveis</li>
                <li>• Dashboard visual</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Desenvolvido para agências e empresas que precisam de controle total sobre seus dados
          </p>
        </div>
      </div>
    </div>
  );
}