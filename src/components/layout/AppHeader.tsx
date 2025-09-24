import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Clientes',
  '/cnpjs': 'CNPJs',
  '/lojas': 'Lojas',
  '/dados-mensais': 'Dados Mensais',
};

export function AppHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const currentRoute = routeNames[location.pathname] || 'Dashboard';

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{currentRoute}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Olá, {user?.email?.split('@')[0]}
        </span>
      </div>
    </header>
  );
}