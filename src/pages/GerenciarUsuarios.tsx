import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Users, UserPlus, Shield, Settings } from 'lucide-react';

interface UserWithRole {
  id: string;
  user_id: string;
  role: 'admin' | 'gerente' | 'assistente';
  created_at: string;
  name: string;
  email: string;
}

interface Cliente {
  id: string;
  nome: string;
  cnpj_principal: string;
}

interface UserAccess {
  id: string;
  user_id: string;
  cliente_id: string;
  granted_by: string;
  cliente_nome: string;
  cliente_cnpj: string;
  user_name: string;
  user_email: string;
}

export default function GerenciarUsuarios() {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'gerente' | 'assistente'>('assistente');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [isGrantAccessOpen, setIsGrantAccessOpen] = useState(false);
  const queryClient = useQueryClient();

  // Buscar todos os usuários com roles
  const { data: userRoles, isLoading: loadingUsers } = useQuery({
    queryKey: ['user-roles-with-profiles'],
    queryFn: async () => {
      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;

      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email');
      
      if (profilesError) throw profilesError;

      // Juntar os dados
      const usersWithRoles: UserWithRole[] = roles.map(role => {
        const profile = profiles.find(p => p.user_id === role.user_id);
        return {
          ...role,
          name: profile?.name || 'Nome não encontrado',
          email: profile?.email || 'Email não encontrado'
        };
      });

      return usersWithRoles;
    }
  });

  // Buscar todos os clientes para o select
  const { data: clientes } = useQuery({
    queryKey: ['clientes-for-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cnpj_principal')
        .order('nome');
      
      if (error) throw error;
      return data as Cliente[];
    }
  });

  // Buscar acessos de usuários a clientes
  const { data: userAccess } = useQuery({
    queryKey: ['user-cliente-access-with-details'],
    queryFn: async () => {
      // Buscar acessos
      const { data: accesses, error: accessError } = await supabase
        .from('user_cliente_access')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (accessError) throw accessError;

      // Buscar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nome, cnpj_principal');
      
      if (clientesError) throw clientesError;

      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email');
      
      if (profilesError) throw profilesError;

      // Juntar os dados
      const accessWithDetails: UserAccess[] = accesses.map(access => {
        const cliente = clientesData.find(c => c.id === access.cliente_id);
        const profile = profiles.find(p => p.user_id === access.user_id);
        
        return {
          ...access,
          cliente_nome: cliente?.nome || 'Cliente não encontrado',
          cliente_cnpj: cliente?.cnpj_principal || '',
          user_name: profile?.name || 'Nome não encontrado',
          user_email: profile?.email || 'Email não encontrado'
        };
      });

      return accessWithDetails;
    }
  });

  // Mutation para criar role de usuário
  const createUserRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'gerente' | 'assistente' }) => {
      // Primeiro buscar o usuário pelo email
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email);
      
      if (userError) throw userError;
      if (!users || users.length === 0) {
        throw new Error('Usuário não encontrado');
      }

      const userId = users[0].user_id;

      // Inserir ou atualizar o role
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-with-profiles'] });
      toast({
        title: "Role definido com sucesso",
        description: "As permissões do usuário foram atualizadas.",
      });
      setNewUserEmail('');
      setNewUserRole('assistente');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir role",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para conceder acesso a cliente
  const grantAccessMutation = useMutation({
    mutationFn: async ({ userId, clienteId }: { userId: string; clienteId: string }) => {
      const { error } = await supabase
        .from('user_cliente_access')
        .insert({
          user_id: userId,
          cliente_id: clienteId,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-cliente-access-with-details'] });
      toast({
        title: "Acesso concedido",
        description: "O usuário agora tem acesso ao cliente selecionado.",
      });
      setIsGrantAccessOpen(false);
      setSelectedUserId('');
      setSelectedClienteId('');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao conceder acesso",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para revogar acesso
  const revokeAccessMutation = useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from('user_cliente_access')
        .delete()
        .eq('id', accessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-cliente-access-with-details'] });
      toast({
        title: "Acesso revogado",
        description: "O acesso foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao revogar acesso",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateUserRole = () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Digite o email do usuário.",
        variant: "destructive",
      });
      return;
    }

    createUserRoleMutation.mutate({
      email: newUserEmail.trim(),
      role: newUserRole
    });
  };

  const handleGrantAccess = () => {
    if (!selectedUserId || !selectedClienteId) {
      toast({
        title: "Seleção obrigatória",
        description: "Selecione um usuário e um cliente.",
        variant: "destructive",
      });
      return;
    }

    grantAccessMutation.mutate({
      userId: selectedUserId,
      clienteId: selectedClienteId
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'gerente':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'gerente':
        return 'Gerente';
      default:  
        return 'Assistente';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie roles e acessos dos usuários do sistema
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card para definir roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Definir Role de Usuário
            </CardTitle>
            <CardDescription>
              Defina o nível de acesso de um usuário no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do usuário</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="assistente">Assistente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleCreateUserRole}
              disabled={createUserRoleMutation.isPending}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {createUserRoleMutation.isPending ? 'Definindo...' : 'Definir Role'}
            </Button>
          </CardContent>
        </Card>

        {/* Card para conceder acesso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Conceder Acesso a Cliente
            </CardTitle>
            <CardDescription>
              Permita que um usuário tenha acesso a um cliente específico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isGrantAccessOpen} onOpenChange={setIsGrantAccessOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Conceder Acesso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conceder Acesso a Cliente</DialogTitle>
                  <DialogDescription>
                    Selecione um usuário e um cliente para conceder acesso
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles?.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.name} ({user.email}) - {getRoleLabel(user.role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes?.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome} ({cliente.cnpj_principal})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleGrantAccess}
                    disabled={grantAccessMutation.isPending}
                    className="w-full"
                  >
                    {grantAccessMutation.isPending ? 'Concedendo...' : 'Conceder Acesso'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de usuários com roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários e Roles
          </CardTitle>
          <CardDescription>
            Lista de todos os usuários e seus níveis de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Data de Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabela de acessos a clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Acessos a Clientes</CardTitle>
          <CardDescription>
            Lista de usuários com acesso específico a clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userAccess?.map((access) => (
                <TableRow key={access.id}>
                  <TableCell>
                    {access.user_name}
                    <br />
                    <span className="text-sm text-muted-foreground">
                      {access.user_email}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{access.cliente_nome}</TableCell>
                  <TableCell>{access.cliente_cnpj}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeAccessMutation.mutate(access.id)}
                      disabled={revokeAccessMutation.isPending}
                    >
                      Revogar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}