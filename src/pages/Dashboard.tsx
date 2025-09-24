import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Building2, Store, TrendingUp, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  faturamento: {
    label: 'Faturamento',
    color: 'hsl(var(--primary))',
  },
  investimento: {
    label: 'Investimento',
    color: 'hsl(var(--secondary))',
  },
  roas: {
    label: 'ROAS',
    color: 'hsl(var(--accent))',
  },
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [clientes, cnpjs, lojas, dadosMensais] = await Promise.all([
        supabase.from('clientes').select('id'),
        supabase.from('cnpjs').select('id'),
        supabase.from('lojas').select('id'),
        supabase.from('dados_mensais').select('*'),
      ]);

      const totalFaturamento = dadosMensais.data?.reduce((acc, item) => 
        acc + Number(item.faturamento_bruto), 0) || 0;
      
      const totalInvestimento = dadosMensais.data?.reduce((acc, item) => 
        acc + Number(item.investimento_ads), 0) || 0;

      const roasGlobal = totalInvestimento > 0 ? totalFaturamento / totalInvestimento : 0;

      return {
        clientes: clientes.data?.length || 0,
        cnpjs: cnpjs.data?.length || 0,
        lojas: lojas.data?.length || 0,
        totalFaturamento,
        totalInvestimento,
        roasGlobal,
      };
    },
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthly-data'],
    queryFn: async () => {
      const { data } = await supabase
        .from('dados_mensais')
        .select(`
          mes,
          ano,
          faturamento_bruto,
          investimento_ads,
          roas,
          lojas (nome, marketplace)
        `)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });

      // Group by month/year
      const groupedData = data?.reduce((acc, item) => {
        const key = `${item.mes}/${item.ano}`;
        if (!acc[key]) {
          acc[key] = {
            periodo: key,
            faturamento: 0,
            investimento: 0,
            roas: 0,
            count: 0,
          };
        }
        acc[key].faturamento += Number(item.faturamento_bruto);
        acc[key].investimento += Number(item.investimento_ads);
        acc[key].roas += Number(item.roas || 0);
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, any>);

      return Object.values(groupedData || {}).map((item: any) => ({
        ...item,
        roas: item.count > 0 ? item.roas / item.count : 0,
      }));
    },
  });

  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery({
    queryKey: ['marketplace-data'],
    queryFn: async () => {
      const { data } = await supabase
        .from('dados_mensais')
        .select(`
          faturamento_bruto,
          lojas (marketplace)
        `);

      const marketplaceStats = data?.reduce((acc, item) => {
        const marketplace = item.lojas?.marketplace || 'outros';
        if (!acc[marketplace]) {
          acc[marketplace] = 0;
        }
        acc[marketplace] += Number(item.faturamento_bruto);
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(marketplaceStats || {}).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }));
    },
  });

  if (statsLoading) {
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gaming-gradient bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Visão geral dos seus marketplaces e performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Atualizado agora
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <div className="absolute inset-0 bg-gaming-gradient-subtle opacity-20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground">
              Clientes
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-primary">{stats?.clientes}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Users className="h-3 w-3" />
              Total de clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">
          <div className="absolute inset-0 bg-accent/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground">
              Lojas
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/10">
              <Store className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-accent">{stats?.lojas}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Store className="h-3 w-3" />
              Lojas ativas nos marketplaces
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <div className="absolute inset-0 bg-gaming-gradient-subtle opacity-20"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground">
              Faturamento Total
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-primary">
              R$ {stats?.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" />
              Receita acumulada
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">
          <div className="absolute inset-0 bg-accent/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-foreground">
              ROAS Médio
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-accent">
              {stats?.roasGlobal.toFixed(2)}x
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" />
              Retorno sobre investimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 hover:border-primary/30 transition-all duration-300">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-8 bg-gaming-gradient rounded-full"></div>
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {monthlyLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : monthlyData && monthlyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="faturamento"
                      stroke="var(--color-faturamento)"
                      strokeWidth={2}
                      name="Faturamento (R$)"
                    />
                    <Line
                      type="monotone"
                      dataKey="investimento"
                      stroke="var(--color-investimento)"
                      strokeWidth={2}
                      name="Investimento (R$)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="p-4 rounded-full bg-muted/20">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Sem dados para mostrar</p>
                  <p className="text-sm">Cadastre dados mensais para ver os gráficos</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-accent/20 hover:border-accent/30 transition-all duration-300">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-8 bg-accent rounded-full"></div>
              Distribuição por Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {marketplaceLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : marketplaceData && marketplaceData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={marketplaceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {marketplaceData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [
                        `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Faturamento'
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="p-4 rounded-full bg-muted/20">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Sem dados para mostrar</p>
                  <p className="text-sm">Cadastre lojas para ver a distribuição</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gaming-gradient rounded-full"></div>
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer hover:bg-primary/5 group">
              <Users className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">Cadastrar Cliente</h3>
              <p className="text-sm text-muted-foreground">Adicione um novo cliente ao sistema</p>
            </div>
            <div className="p-4 rounded-lg border border-accent/20 hover:border-accent/40 transition-colors cursor-pointer hover:bg-accent/5 group">
              <Building2 className="h-6 w-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">Adicionar CNPJ</h3>
              <p className="text-sm text-muted-foreground">Registre CNPJs dos seus clientes</p>
            </div>
            <div className="p-4 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer hover:bg-primary/5 group">
              <Store className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold">Criar Loja</h3>
              <p className="text-sm text-muted-foreground">Configure lojas nos marketplaces</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}