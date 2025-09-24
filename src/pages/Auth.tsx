import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BarChart3, TrendingUp } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      loginForm.setError('root', { message: error });
    }
    setIsLoading(false);
  };

  const handleSignup = async (data: SignupForm) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.name);
    if (error) {
      signupForm.setError('root', { message: error });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex justify-center items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 animate-glow">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">B2X Analytics</h1>
          <p className="text-white/80 text-lg">Sistema de Relatórios para Marketplaces</p>
          <div className="w-20 h-1 bg-accent rounded-full mx-auto mt-4"></div>
        </div>

        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl animate-fadeIn">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl text-white">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-white/70 text-base">
              Faça login ou crie sua conta para começar a gerenciar seus marketplaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/20 backdrop-blur-sm">
                <TabsTrigger 
                  value="login" 
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white border-0"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white border-0"
                >
                  Registrar
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="seu@email.com" 
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent focus:ring-accent"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-accent" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent focus:ring-accent"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-accent" />
                        </FormItem>
                      )}
                    />
                    {loginForm.formState.errors.root && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive text-center">
                          {loginForm.formState.errors.root.message}
                        </p>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Nome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Seu nome completo" 
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent focus:ring-accent"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-accent" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="seu@email.com" 
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent focus:ring-accent"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-accent" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Senha</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Mínimo 6 caracteres" 
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-accent focus:ring-accent"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-accent" />
                        </FormItem>
                      )}
                    />
                    {signupForm.formState.errors.root && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive text-center">
                          {signupForm.formState.errors.root.message}
                        </p>
                      </div>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? 'Criando conta...' : 'Criar Conta'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-white/60 flex items-center justify-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" />
            Gerencie seus marketplaces com analytics avançados
          </p>
          <div className="mt-6 flex justify-center space-x-4 text-white/40 text-xs">
            <span>Shopee</span>
            <span>•</span>
            <span>Mercado Livre</span>
            <span>•</span>
            <span>TikTok Shop</span>
            <span>•</span>
            <span>Magalu</span>
          </div>
        </div>
      </div>
    </div>
  );
}