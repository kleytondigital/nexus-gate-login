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
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface CNPJ {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: string | null;
  cliente_id: string;
  created_at: string;
  updated_at: string;
  clientes: {
    nome: string;
  };
}

interface Cliente {
  id: string;
  nome: string;
}

export default function CNPJs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCNPJ, setEditingCNPJ] = useState<CNPJ | null>(null);
  const [formData, setFormData] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    endereco: '',
    cliente_id: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch CNPJs
  const { data: cnpjs, isLoading: loadingCNPJs } = useQuery({
    queryKey: ['cnpjs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cnpjs')
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CNPJ[];
    }
  });

  // Fetch Clientes for dropdown
  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome');
      
      if (error) throw error;
      return data as Cliente[];
    }
  });

  // Create/Update CNPJ mutation
  const saveCNPJMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingCNPJ) {
        const { error } = await supabase
          .from('cnpjs')
          .update(data)
          .eq('id', editingCNPJ.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cnpjs')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnpjs'] });
      setIsDialogOpen(false);
      setEditingCNPJ(null);
      resetForm();
      toast({
        title: editingCNPJ ? 'CNPJ atualizado' : 'CNPJ criado',
        description: editingCNPJ ? 'CNPJ atualizado com sucesso!' : 'Novo CNPJ criado com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao ${editingCNPJ ? 'atualizar' : 'criar'} CNPJ: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Delete CNPJ mutation
  const deleteCNPJMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cnpjs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cnpjs'] });
      toast({
        title: 'CNPJ excluído',
        description: 'CNPJ excluído com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir CNPJ: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
      endereco: '',
      cliente_id: ''
    });
  };

  const handleEdit = (cnpj: CNPJ) => {
    setEditingCNPJ(cnpj);
    setFormData({
      cnpj: cnpj.cnpj,
      razao_social: cnpj.razao_social,
      nome_fantasia: cnpj.nome_fantasia,
      endereco: cnpj.endereco || '',
      cliente_id: cnpj.cliente_id
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cnpj || !formData.razao_social || !formData.nome_fantasia || !formData.cliente_id) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    saveCNPJMutation.mutate(formData);
  };

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCNPJChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      setFormData({ ...formData, cnpj: numbers });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CNPJs</h1>
          <p className="text-muted-foreground">
            Gerencie os CNPJs dos seus clientes
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCNPJ(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo CNPJ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingCNPJ ? 'Editar CNPJ' : 'Novo CNPJ'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do CNPJ
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes?.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formatCNPJ(formData.cnpj)}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  placeholder="Digite a razão social"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                <Input
                  id="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Digite o nome fantasia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Digite o endereço completo"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveCNPJMutation.isPending}>
                  {saveCNPJMutation.isPending ? 'Salvando...' : editingCNPJ ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de CNPJs
          </CardTitle>
          <CardDescription>
            CNPJs cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCNPJs ? (
            <div className="text-center py-4">Carregando...</div>
          ) : cnpjs && cnpjs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cnpjs.map((cnpj) => (
                  <TableRow key={cnpj.id}>
                    <TableCell className="font-medium">
                      {cnpj.clientes.nome}
                    </TableCell>
                    <TableCell>{formatCNPJ(cnpj.cnpj)}</TableCell>
                    <TableCell>{cnpj.razao_social}</TableCell>
                    <TableCell>{cnpj.nome_fantasia}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(cnpj)}
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
                                Tem certeza que deseja excluir este CNPJ? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCNPJMutation.mutate(cnpj.id)}
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
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum CNPJ encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro CNPJ
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo CNPJ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}