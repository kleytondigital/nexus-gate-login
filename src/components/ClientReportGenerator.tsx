import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Share2, Calendar, TrendingUp, DollarSign, Package, Target, Building2, Store } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateClientInsights, 
  generateClientWhatsAppReport, 
  generateClientPDF, 
  formatCurrency, 
  formatPercentage,
  type ClienteData,
  type LojaConsolidada,
  type ClientReportData 
} from "@/lib/reportUtils";

interface ClientReportGeneratorProps {
  cliente: ClienteData;
  isOpen: boolean;
  onClose: () => void;
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

const ANOS = Array.from({ length: 5 }, (_, i) => {
  const ano = new Date().getFullYear() - i;
  return { value: ano, label: ano.toString() };
});

export function ClientReportGenerator({ cliente, isOpen, onClose }: ClientReportGeneratorProps) {
  const [selectedMes, setSelectedMes] = useState<number>();
  const [selectedAno, setSelectedAno] = useState<number>();
  const [compararMes, setCompararMes] = useState<number>();
  const [compararAno, setCompararAno] = useState<number>();
  const [reportData, setReportData] = useState<ClientReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Buscar todas as lojas e dados mensais do cliente
  const { data: lojasData, isLoading: isLoadingLojas } = useQuery({
    queryKey: ['lojas-cliente-completas', cliente.id],
    queryFn: async () => {
      // Buscar lojas do cliente com dados mensais
      const { data: lojasResult, error: lojasError } = await supabase
        .from('lojas')
        .select(`
          id,
          nome,
          marketplace,
          url,
          ativa,
          cnpj:cnpjs!inner (
            id,
            cnpj,
            nome_fantasia,
            cliente:clientes!inner (
              id,
              nome
            )
          )
        `)
        .eq('cnpj.cliente.id', cliente.id)
        .eq('ativa', true);

      if (lojasError) throw lojasError;

      // Buscar dados mensais para todas as lojas
      const lojaIds = lojasResult?.map(loja => loja.id) || [];
      
      if (lojaIds.length === 0) {
        return [];
      }

      const { data: dadosResult, error: dadosError } = await supabase
        .from('dados_mensais')
        .select('*')
        .in('loja_id', lojaIds)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (dadosError) throw dadosError;

      // Agrupar dados por loja
      const lojasConsolidadas: LojaConsolidada[] = lojasResult?.map(loja => ({
        ...loja,
        dados_mensais: dadosResult?.filter(dado => dado.loja_id === loja.id) || []
      })) || [];

      return lojasConsolidadas;
    },
    enabled: isOpen && !!cliente.id
  });

  const canGenerateReport = selectedMes && selectedAno && lojasData && lojasData.length > 0;

  const handleGenerateReport = async () => {
    if (!lojasData || !selectedMes || !selectedAno) return;

    setIsGenerating(true);
    
    try {
      const reportData: ClientReportData = {
        cliente,
        lojas: lojasData,
        periodo: { mes: selectedMes, ano: selectedAno },
        comparacao: compararMes && compararAno ? { mes: compararMes, ano: compararAno } : undefined
      };

      setReportData(reportData);
      toast.success("Relatório consolidado gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportWhatsApp = () => {
    if (!reportData) return;

    const insights = calculateClientInsights(reportData);
    const whatsappText = generateClientWhatsAppReport(reportData, insights);
    
    navigator.clipboard.writeText(whatsappText).then(() => {
      toast.success("Relatório consolidado copiado para área de transferência!");
    }).catch(() => {
      toast.error("Erro ao copiar relatório");
    });
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    try {
      const insights = calculateClientInsights(reportData);
      const pdf = generateClientPDF(reportData, insights);
      const mesNome = MESES.find(m => m.value === reportData.periodo.mes)?.label;
      
      pdf.save(`relatorio-consolidado-${cliente.nome}-${mesNome}-${reportData.periodo.ano}.pdf`);
      toast.success("PDF consolidado gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const resetForm = () => {
    setSelectedMes(undefined);
    setSelectedAno(undefined);
    setCompararMes(undefined);
    setCompararAno(undefined);
    setReportData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Preview do relatório
  const previewInsights = reportData ? calculateClientInsights(reportData) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório Consolidado por Cliente
          </DialogTitle>
          <DialogDescription>
            {cliente.nome} - Todas as lojas e marketplaces
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuração do Relatório */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período do Relatório
                </CardTitle>
                <CardDescription>
                  {lojasData ? `${lojasData.length} loja(s) encontrada(s)` : 'Carregando lojas...'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Mês</label>
                    <Select value={selectedMes?.toString()} onValueChange={(value) => setSelectedMes(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map(mes => (
                          <SelectItem key={mes.value} value={mes.value.toString()}>
                            {mes.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ano</label>
                    <Select value={selectedAno?.toString()} onValueChange={(value) => setSelectedAno(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANOS.map(ano => (
                          <SelectItem key={ano.value} value={ano.value.toString()}>
                            {ano.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Comparação (Opcional)
                </CardTitle>
                <CardDescription>
                  Compare com outro período para análise de crescimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Mês</label>
                    <Select value={compararMes?.toString()} onValueChange={(value) => setCompararMes(value ? parseInt(value) : undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map(mes => (
                          <SelectItem key={mes.value} value={mes.value.toString()}>
                            {mes.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ano</label>
                    <Select value={compararAno?.toString()} onValueChange={(value) => setCompararAno(value ? parseInt(value) : undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANOS.map(ano => (
                          <SelectItem key={ano.value} value={ano.value.toString()}>
                            {ano.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateReport}
                disabled={!canGenerateReport || isGenerating || isLoadingLojas}
                className="flex-1"
              >
                {isGenerating ? "Gerando..." : "Gerar Relatório Consolidado"}
              </Button>
            </div>

            {lojasData && lojasData.length === 0 && !isLoadingLojas && (
              <Card>
                <CardContent className="flex items-center justify-center py-4">
                  <div className="text-center text-muted-foreground">
                    <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Este cliente não possui lojas ativas cadastradas</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview do Relatório */}
          <div className="space-y-4">
            {previewInsights && reportData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview do Relatório Consolidado</CardTitle>
                    <CardDescription>
                      {MESES.find(m => m.value === reportData.periodo.mes)?.label} {reportData.periodo.ano}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Resumo geral */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Vendas Totais</p>
                          <p className="font-semibold">{formatCurrency(previewInsights.totalVendas)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Itens Totais</p>
                          <p className="font-semibold">{previewInsights.totalItens}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">ROAS Médio</p>
                          <p className="font-semibold">{previewInsights.roasMedia.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Investimento</p>
                          <p className="font-semibold">{formatCurrency(previewInsights.totalAds)}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">CNPJs</p>
                          <p className="font-semibold">{previewInsights.totalCnpjs}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Lojas</p>
                          <p className="font-semibold">{previewInsights.totalLojas}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded" />
                        <div>
                          <p className="text-sm text-muted-foreground">Marketplaces</p>
                          <p className="font-semibold">{previewInsights.totalMarketplaces}</p>
                        </div>
                      </div>
                    </div>

                    {previewInsights.crescimentoVendas !== undefined && (
                      <div className="mt-4">
                        <Separator className="mb-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Crescimento Geral em Vendas:</span>
                          <Badge variant={previewInsights.crescimentoVendas > 0 ? "default" : "destructive"}>
                            {formatPercentage(previewInsights.crescimentoVendas)}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {previewInsights.melhorLoja && (
                      <div className="mt-4">
                        <Separator className="mb-2" />
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Melhor loja em vendas:</p>
                          <p className="text-sm font-medium">{previewInsights.melhorLoja.nome}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(previewInsights.melhorLoja.vendas)}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <Separator className="mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Recomendação:</p>
                      <p className="text-sm">{previewInsights.recomendacao}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExportWhatsApp}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Configure os parâmetros e gere o relatório</p>
                    <p className="text-sm">para visualizar o preview consolidado</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}