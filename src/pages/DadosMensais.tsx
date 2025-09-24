import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, Plus, Pencil, Trash2, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface DadosMensais {
  id: string;
  loja_id: string;
  mes: number;
  ano: number;
  faturamento_bruto: number;
  investimento_ads: number;
  itens_vendidos: number;
  tipo_campanha: 'organica' | 'paga' | 'ambas';
  roas: number | null;
  acos: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  lojas: {
    nome: string;
    marketplace: string;
    cnpjs: {
      nome_fantasia: string;
      cnpj: string;
      clientes: {
        nome: string;
      };
    };
  };
}

interface Loja {
  id: string;
  nome: string;
  marketplace: string;
  cnpjs: {
    nome_fantasia: string;
    cnpj: string;
    clientes: {
      nome: string;
    };
  };
}

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const TIPOS_CAMPANHA = [
  { value: 'organica', label: 'Orgânica' },
  { value: 'paga', label: 'Paga' },
  { value: 'ambas', label: 'Ambas' }
];

const MARKETPLACE_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
  tiktok_shop: 'TikTok Shop',
  shein: 'Shein',
  magalu: 'Magazine Luiza',
  amazon: 'Amazon',
  outros: 'Outros'
};

export default function DadosMensais() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDados, setEditingDados] = useState<DadosMensais | null>(null);
  const [formData, setFormData] = useState({
    loja_id: '',
    mes: '',
    ano: new Date().getFullYear().toString(),
    faturamento_bruto: '',
    investimento_ads: '',
    itens_vendidos: '',
    tipo_campanha: 'ambas' as 'organica' | 'paga' | 'ambas',
    observacoes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Dados Mensais
  const { data: dadosMensais, isLoading: loadingDados } = useQuery({
    queryKey: ['dados-mensais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dados_mensais')
        .select(`
          *,
          lojas (
            nome,
            marketplace,
            cnpjs (
              nome_fantasia,
              cnpj,
              clientes (
                nome
              )
            )
          )
        `)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });
      
      if (error) throw error;
      return data as DadosMensais[];
    }
  });

  // Fetch Lojas for dropdown
  const { data: lojas } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select(`
          id,
          nome,
          marketplace,
          cnpjs (
            nome_fantasia,
            cnpj,
            clientes (
              nome
            )
          )
        `)
        .eq('ativa', true)
        .order('nome');
      
      if (error) throw error;
      return data as Loja[];
    }
  });

  // Calculate ROAS and ACOS
  const calculateMetrics = (faturamento: number, investimento: number) => {
    if (investimento === 0) {
      return { roas: null, acos: null };
    }
    
    const roas = faturamento / investimento;
    const acos = (investimento / faturamento) * 100;
    
    return {
      roas: parseFloat(roas.toFixed(2)),
      acos: parseFloat(acos.toFixed(2))
    };
  };

  // Create/Update Dados mutation
  const saveDadosMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const faturamento = parseFloat(data.faturamento_bruto);
      const investimento = parseFloat(data.investimento_ads);
      const metrics = calculateMetrics(faturamento, investimento);
      
      const submitData = {
        loja_id: data.loja_id,
        mes: parseInt(data.mes),
        ano: parseInt(data.ano),
        faturamento_bruto: faturamento,
        investimento_ads: investimento,
        itens_vendidos: parseInt(data.itens_vendidos),
        tipo_campanha: data.tipo_campanha,
        observacoes: data.observacoes || null
      };

      if (editingDados) {
        const { error } = await supabase
          .from('dados_mensais')
          .update(submitData)
          .eq('id', editingDados.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dados_mensais')
          .insert([submitData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dados-mensais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-data'] });
      setIsDialogOpen(false);
      setEditingDados(null);
      resetForm();
      toast({
        title: editingDados ? 'Dados atualizados' : 'Dados criados',
        description: editingDados ? 'Dados mensais atualizados com sucesso!' : 'Novos dados mensais criados com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao ${editingDados ? 'atualizar' : 'criar'} dados: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Delete Dados mutation
  const deleteDadosMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dados_mensais')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dados-mensais'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-data'] });
      toast({
        title: 'Dados excluídos',
        description: 'Dados mensais excluídos com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir dados: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      loja_id: '',
      mes: '',
      ano: new Date().getFullYear().toString(),
      faturamento_bruto: '',
      investimento_ads: '',
      itens_vendidos: '',
      tipo_campanha: 'ambas',
      observacoes: ''
    });
  };

  const handleEdit = (dados: DadosMensais) => {
    setEditingDados(dados);
    setFormData({
      loja_id: dados.loja_id,
      mes: dados.mes.toString(),
      ano: dados.ano.toString(),
      faturamento_bruto: dados.faturamento_bruto.toString(),
      investimento_ads: dados.investimento_ads.toString(),
      itens_vendidos: dados.itens_vendidos.toString(),
      tipo_campanha: dados.tipo_campanha,
      observacoes: dados.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.loja_id || !formData.mes || !formData.ano || !formData.faturamento_bruto || !formData.investimento_ads || !formData.itens_vendidos) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    saveDadosMutation.mutate(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // Calculate preview metrics
  const previewMetrics = () => {
    if (formData.faturamento_bruto && formData.investimento_ads) {
      const faturamento = parseFloat(formData.faturamento_bruto);
      const investimento = parseFloat(formData.investimento_ads);
      return calculateMetrics(faturamento, investimento);
    }
    return { roas: null, acos: null };
  };

  const metrics = previewMetrics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dados Mensais</h1>
          <p className="text-muted-foreground">
            Gerencie os dados mensais de performance das suas lojas
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDados(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novos Dados
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                {editingDados ? 'Editar Dados Mensais' : 'Novos Dados Mensais'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações de performance do mês
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loja">Loja *</Label>
                  <Select value={formData.loja_id} onValueChange={(value) => setFormData({ ...formData, loja_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas?.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome} - {MARKETPLACE_LABELS[loja.marketplace]} ({loja.cnpjs.clientes.nome})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mes">Mês *</Label>
                  <Select value={formData.mes} onValueChange={(value) => setFormData({ ...formData, mes: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value.toString()}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ano">Ano *</Label>
                  <Input
                    id="ano"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                    placeholder="2024"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="faturamento_bruto">Faturamento Bruto (R$) *</Label>
                  <Input
                    id="faturamento_bruto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.faturamento_bruto}
                    onChange={(e) => setFormData({ ...formData, faturamento_bruto: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investimento_ads">Investimento em Ads (R$) *</Label>
                  <Input
                    id="investimento_ads"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.investimento_ads}
                    onChange={(e) => setFormData({ ...formData, investimento_ads: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itens_vendidos">Itens Vendidos *</Label>
                  <Input
                    id="itens_vendidos"
                    type="number"
                    min="0"
                    value={formData.itens_vendidos}
                    onChange={(e) => setFormData({ ...formData, itens_vendidos: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_campanha">Tipo de Campanha *</Label>
                  <Select value={formData.tipo_campanha} onValueChange={(value: 'organica' | 'paga' | 'ambas') => setFormData({ ...formData, tipo_campanha: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CAMPANHA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview of calculated metrics */}
              {metrics.roas !== null && metrics.acos !== null && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Métricas Calculadas (Preview)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ROAS:</span>
                        <span className="ml-2 font-semibold">{metrics.roas}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ACOS:</span>
                        <span className="ml-2 font-semibold">{metrics.acos}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Adicione observações sobre o período (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveDadosMutation.isPending}>
                  {saveDadosMutation.isPending ? 'Salvando...' : editingDados ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Dados Mensais Cadastrados
          </CardTitle>
          <CardDescription>
            Histórico de performance das lojas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDados ? (
            <div className="text-center py-4">Carregando...</div>
          ) : dadosMensais && dadosMensais.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Invest. Ads</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>ACOS</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosMensais.map((dados) => (
                  <TableRow key={dados.id}>
                    <TableCell className="font-medium">
                      {dados.lojas.cnpjs.clientes.nome}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{dados.lojas.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {MARKETPLACE_LABELS[dados.lojas.marketplace]}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {MESES.find(m => m.value === dados.mes)?.label} {dados.ano}
                    </TableCell>
                    <TableCell>{formatCurrency(dados.faturamento_bruto)}</TableCell>
                    <TableCell>{formatCurrency(dados.investimento_ads)}</TableCell>
                    <TableCell>{dados.itens_vendidos.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={dados.roas && dados.roas >= 3 ? "default" : "secondary"}>
                        {dados.roas ? dados.roas.toFixed(2) : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dados.acos && dados.acos <= 30 ? "default" : "secondary"}>
                        {dados.acos ? `${dados.acos.toFixed(1)}%` : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TIPOS_CAMPANHA.find(t => t.value === dados.tipo_campanha)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(dados)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir estes dados mensais? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDadosMutation.mutate(dados.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum dado encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando os dados mensais da sua primeira loja
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novos Dados
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}