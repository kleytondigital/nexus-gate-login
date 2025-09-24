import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, Plus, FileBarChart, Store } from "lucide-react";
import { toast } from "sonner";
import { formatCNPJ } from "@/lib/cnpj-utils";
import { SearchFilters } from "@/components/SearchFilters";
import { ReportGenerator } from "@/components/ReportGenerator";

interface Loja {
  id: string;
  nome: string;
  marketplace: string;
  url: string | null;
  ativa: boolean;
  cnpj_id: string;
  created_at: string;
  updated_at: string;
  cnpj: {
    id: string;
    cnpj: string;
    nome_fantasia: string;
    cliente: {
      id: string;
      nome: string;
    };
  };
}

interface CNPJ {
  id: string;
  nome_fantasia: string;
  cnpj: string;
  cliente: {
    id: string;
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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedLojaForReport, setSelectedLojaForReport] = useState<Loja | null>(null);
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  
  const [formData, setFormData] = useState({
    cnpj_id: '',
    nome: '',
    marketplace: '' as MarketplaceType | '',
    url: '',
    ativa: true,
  });

  const queryClient = useQueryClient();

  // Fetch lojas with related data
  const { data: lojas, isLoading: isLoadingLojas } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select(`
          *,
          cnpj:cnpjs(
            id,
            cnpj,
            nome_fantasia,
            cliente:clientes(
              id,
              nome
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Loja[];
    },
  });

  // Fetch CNPJs for dropdown
  const { data: cnpjs, isLoading: isLoadingCNPJs } = useQuery({
    queryKey: ['cnpjs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cnpjs')
        .select(`
          *,
          cliente:clientes(
            id,
            nome
          )
        `)
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;
      return data as CNPJ[];
    },
  });

  // Clientes únicos para filtro
  const uniqueClients = useMemo(() => {
    if (!lojas) return [];
    const clientMap = new Map();
    lojas.forEach(loja => {
      if (loja.cnpj?.cliente) {
        clientMap.set(loja.cnpj.cliente.id, loja.cnpj.cliente);
      }
    });
    return Array.from(clientMap.values());
  }, [lojas]);

  // Filtrar lojas com base na busca e filtros
  const filteredLojas = useMemo(() => {
    if (!lojas) return [];

    return lojas.filter(loja => {
      // Filtro de busca por texto
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        loja.nome.toLowerCase().includes(searchLower) ||
        loja.cnpj?.cliente?.nome.toLowerCase().includes(searchLower) ||
        loja.cnpj?.cnpj.includes(searchTerm) ||
        loja.cnpj?.nome_fantasia.toLowerCase().includes(searchLower);

      // Filtro por marketplace
      const matchesMarketplace = !selectedMarketplace || loja.marketplace === selectedMarketplace;

      // Filtro por status
      const matchesStatus = !selectedStatus || loja.ativa.toString() === selectedStatus;

      // Filtro por cliente
      const matchesClient = !selectedClient || loja.cnpj?.cliente?.id === selectedClient;

      return matchesSearch && matchesMarketplace && matchesStatus && matchesClient;
    });
  }, [lojas, searchTerm, selectedMarketplace, selectedStatus, selectedClient]);

  // Create/Update Loja mutation
  const saveLojaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const submitData = {
        ...data,
        marketplace: data.marketplace as MarketplaceType
      };
      
      if (editingLoja) {
        const { error } = await supabase
          .from('lojas')
          .update(submitData)
          .eq('id', editingLoja.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lojas')
          .insert([submitData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      setIsDialogOpen(false);
      setEditingLoja(null);
      resetForm();
      toast.success(editingLoja ? 'Loja atualizada com sucesso!' : 'Nova loja criada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao ${editingLoja ? 'atualizar' : 'criar'} loja: ${error.message}`);
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
      toast.success('Loja excluída com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir loja: ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      cnpj_id: '',
      nome: '',
      marketplace: '',
      url: '',
      ativa: true,
    });
  };

  const handleEdit = (loja: Loja) => {
    setEditingLoja(loja);
    setFormData({
      cnpj_id: loja.cnpj_id,
      nome: loja.nome,
      marketplace: loja.marketplace as MarketplaceType,
      url: loja.url || '',
      ativa: loja.ativa,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cnpj_id || !formData.nome || !formData.marketplace) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    saveLojaMutation.mutate(formData);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedMarketplace('');
    setSelectedStatus('');
    setSelectedClient('');
  };

  const handleOpenReportDialog = (loja: Loja) => {
    setSelectedLojaForReport(loja);
    setIsReportDialogOpen(true);
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
                        {cnpj.nome_fantasia} - {formatCNPJ(cnpj.cnpj)} ({cnpj.cliente.nome})
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Lojas Cadastradas
              </CardTitle>
              <CardDescription>
                {filteredLojas?.length || 0} loja(s) encontrada(s)
              </CardDescription>
            </div>
          </div>
          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedMarketplace={selectedMarketplace}
            setSelectedMarketplace={setSelectedMarketplace}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            clients={uniqueClients}
            onClearFilters={handleClearFilters}
          />
        </CardHeader>
        <CardContent>
          {isLoadingLojas ? (
            <div className="text-center py-4">Carregando lojas...</div>
          ) : !filteredLojas || filteredLojas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || selectedMarketplace || selectedStatus || selectedClient 
                ? "Nenhuma loja encontrada com os filtros aplicados." 
                : "Nenhuma loja cadastrada ainda."
              }
            </div>
          ) : (
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
                {filteredLojas?.map((loja) => (
                  <TableRow key={loja.id}>
                    <TableCell className="font-medium">
                      {loja.cnpj?.cliente?.nome}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{loja.cnpj?.nome_fantasia}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCNPJ(loja.cnpj?.cnpj || '')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{loja.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {MARKETPLACE_LABELS[loja.marketplace as MarketplaceType]}
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
                          onClick={() => handleOpenReportDialog(loja)}
                          title="Gerar Relatório"
                        >
                          <FileBarChart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(loja)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a loja "{loja.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteLojaMutation.mutate(loja.id)}>
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
          )}
        </CardContent>
      </Card>

      {/* Dialog de Geração de Relatório */}
      {selectedLojaForReport && (
        <ReportGenerator
          loja={selectedLojaForReport}
          isOpen={isReportDialogOpen}
          onClose={() => {
            setIsReportDialogOpen(false);
            setSelectedLojaForReport(null);
          }}
        />
      )}
    </div>
  );
}