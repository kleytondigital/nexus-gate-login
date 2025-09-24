import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MARKETPLACE_OPTIONS = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'mercado_livre', label: 'Mercado Livre' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
  { value: 'shein', label: 'Shein' },
  { value: 'magalu', label: 'Magalu' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'outros', label: 'Outros' }
];

const STATUS_OPTIONS = [
  { value: 'true', label: 'Ativa' },
  { value: 'false', label: 'Inativa' }
];

interface SearchFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedMarketplace: string;
  setSelectedMarketplace: (marketplace: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  clients: Array<{ id: string; nome: string }>;
  onClearFilters: () => void;
}

export function SearchFilters({
  searchTerm,
  setSearchTerm,
  selectedMarketplace,
  setSelectedMarketplace,
  selectedStatus,
  setSelectedStatus,
  selectedClient,
  setSelectedClient,
  clients,
  onClearFilters
}: SearchFiltersProps) {
  const activeFiltersCount = [selectedMarketplace, selectedStatus, selectedClient].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome da loja, cliente ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtros:</span>
        </div>
        
        <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            {MARKETPLACE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar ({activeFiltersCount})
          </Button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMarketplace && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {MARKETPLACE_OPTIONS.find(opt => opt.value === selectedMarketplace)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setSelectedMarketplace('')}
              />
            </Badge>
          )}
          {selectedStatus && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {STATUS_OPTIONS.find(opt => opt.value === selectedStatus)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setSelectedStatus('')}
              />
            </Badge>
          )}
          {selectedClient && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {clients.find(client => client.id === selectedClient)?.nome}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setSelectedClient('')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}