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
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visão geral dos seus dados de marketplace
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clientes}</div>
            <p className="text-xs text-muted-foreground">
              Total de clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lojas</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lojas}</div>
            <p className="text-xs text-muted-foreground">
              Lojas ativas nos marketplaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita acumulada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.roasGlobal.toFixed(2)}x
            </div>
            <p className="text-xs text-muted-foreground">
              Retorno sobre investimento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            {marketplaceLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}