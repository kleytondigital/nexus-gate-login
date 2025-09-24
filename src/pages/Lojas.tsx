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
import { Switch } from '@/components/ui/switch';
import { Store, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface Loja {
  id: string;
  nome: string;
  marketplace: string;
  url: string | null;
  ativa: boolean;
  cnpj_id: string;
  created_at: string;
  updated_at: string;
  cnpjs: {
    nome_fantasia: string;
    cnpj: string;
    clientes: {
      nome: string;
    };
  };
}

interface CNPJ {
  id: string;
  nome_fantasia: string;
  cnpj: string;
  clientes: {
    nome: string;
  };
}

const MARKETPLACES = [
  'shopee',
  'mercado_livre',
  'tiktok_shop',
  'shein',
  'magalu',
  'amazon',
  'outros'
] as const;

type MarketplaceType = typeof MARKETPLACES[number];

const MARKETPLACE_LABELS: Record<MarketplaceType, string> = {
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
  tiktok_shop: 'TikTok Shop',
  shein: 'Shein',
  magalu: 'Magazine Luiza',
  amazon: 'Amazon',
  outros: 'Outros'
};

export default function Lojas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    marketplace: MarketplaceType | '';
    url: string;
    ativa: boolean;
    cnpj_id: string;
  }>({
    nome: '',
    marketplace: '',
    url: '',
    ativa: true,
    cnpj_id: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Lojas
  const { data: lojas, isLoading: loadingLojas } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select(`
          *,
          cnpjs (
            nome_fantasia,
            cnpj,
            clientes (
              nome
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Loja[];
    }
  });

  // Fetch CNPJs for dropdown
  const { data: cnpjs } = useQuery({
    queryKey: ['cnpjs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cnpjs')
        .select(`
          id,
          nome_fantasia,
          cnpj,
          clientes (
            nome
          )
        `)
        .order('nome_fantasia');
      
      if (error) throw error;
      return data as CNPJ[];
    }
  });

  // Create/Update Loja mutation
  const saveLojaMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, 'marketplace'> & { marketplace: MarketplaceType }) => {
      if (editingLoja) {
        const { error } = await supabase
          .from('lojas')
          .update(data)
          .eq('id', editingLoja.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lojas')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      setIsDialogOpen(false);
      setEditingLoja(null);
      resetForm();
      toast({
        title: editingLoja ? 'Loja atualizada' : 'Loja criada',
        description: editingLoja ? 'Loja atualizada com sucesso!' : 'Nova loja criada com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao ${editingLoja ? 'atualizar' : 'criar'} loja: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Delete Loja mutation
  const deleteLojaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lojas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      toast({
        title: 'Loja excluída',
        description: 'Loja excluída com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir loja: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      marketplace: '',
      url: '',
      ativa: true,
      cnpj_id: ''
    });
  };

  const handleEdit = (loja: Loja) => {
    setEditingLoja(loja);
    setFormData({
      nome: loja.nome,
      marketplace: loja.marketplace as MarketplaceType,
      url: loja.url || '',
      ativa: loja.ativa,
      cnpj_id: loja.cnpj_id
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.marketplace || !formData.cnpj_id) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    saveLojaMutation.mutate({
      ...formData,
      marketplace: formData.marketplace as MarketplaceType
    });
  };

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lojas</h1>
          <p className="text-muted-foreground">
            Gerencie as lojas dos seus CNPJs em diferentes marketplaces
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLoja(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingLoja ? 'Editar Loja' : 'Nova Loja'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações da loja
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Select value={formData.cnpj_id} onValueChange={(value) => setFormData({ ...formData, cnpj_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um CNPJ" />
                  </SelectTrigger>
                  <SelectContent>
                    {cnpjs?.map((cnpj) => (
                      <SelectItem key={cnpj.id} value={cnpj.id}>
                        {cnpj.nome_fantasia} - {formatCNPJ(cnpj.cnpj)} ({cnpj.clientes.nome})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Loja *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Digite o nome da loja"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketplace">Marketplace *</Label>
                  <Select value={formData.marketplace} onValueChange={(value: MarketplaceType) => setFormData({ ...formData, marketplace: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o marketplace" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKETPLACES.map((marketplace) => (
                        <SelectItem key={marketplace} value={marketplace}>
                          {MARKETPLACE_LABELS[marketplace]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL da Loja</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativa"
                  checked={formData.ativa}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                />
                <Label htmlFor="ativa">Loja ativa</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveLojaMutation.isPending}>
                  {saveLojaMutation.isPending ? 'Salvando...' : editingLoja ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Lista de Lojas
          </CardTitle>
          <CardDescription>
            Lojas cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLojas ? (
            <div className="text-center py-4">Carregando...</div>
          ) : lojas && lojas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Nome da Loja</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lojas.map((loja) => (
                  <TableRow key={loja.id}>
                    <TableCell className="font-medium">
                      {loja.cnpjs.clientes.nome}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{loja.cnpjs.nome_fantasia}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCNPJ(loja.cnpjs.cnpj)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{loja.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {MARKETPLACE_LABELS[loja.marketplace]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loja.ativa ? "default" : "secondary"}>
                        {loja.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(loja)}
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
                                Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteLojaMutation.mutate(loja.id)}
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
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma loja encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira loja
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Loja
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}