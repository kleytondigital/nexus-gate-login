import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Share2, Calendar, TrendingUp, DollarSign, Package, Target } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateInsights, 
  generateWhatsAppReport, 
  generatePDF, 
  formatCurrency, 
  formatPercentage,
  type LojaData,
  type DadosMensais,
  type ReportData 
} from "@/lib/reportUtils";

interface ReportGeneratorProps {
  loja: LojaData;
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

export function ReportGenerator({ loja, isOpen, onClose }: ReportGeneratorProps) {
  const [selectedMes, setSelectedMes] = useState<number>();
  const [selectedAno, setSelectedAno] = useState<number>();
  const [compararMes, setCompararMes] = useState<number>();
  const [compararAno, setCompararAno] = useState<number>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Buscar dados mensais da loja
  const { data: dadosMensais, isLoading: isLoadingDados } = useQuery({
    queryKey: ['dados-mensais-loja', loja.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dados_mensais')
        .select('*')
        .eq('loja_id', loja.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (error) throw error;
      return data as DadosMensais[];
    },
  });

  const canGenerateReport = selectedMes && selectedAno;

  const handleGenerateReport = async () => {
    if (!dadosMensais || !selectedMes || !selectedAno) return;

    setIsGenerating(true);
    
    try {
      const reportData: ReportData = {
        loja,
        dados: dadosMensais,
        periodo: { mes: selectedMes, ano: selectedAno },
        comparacao: compararMes && compararAno ? { mes: compararMes, ano: compararAno } : undefined
      };

      setReportData(reportData);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportWhatsApp = () => {
    if (!reportData) return;

    const insights = calculateInsights(reportData);
    const whatsappText = generateWhatsAppReport(reportData, insights);
    
    navigator.clipboard.writeText(whatsappText).then(() => {
      toast.success("Relatório copiado para área de transferência!");
    }).catch(() => {
      toast.error("Erro ao copiar relatório");
    });
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    try {
      const insights = calculateInsights(reportData);
      const pdf = generatePDF(reportData, insights);
      const mesNome = MESES.find(m => m.value === reportData.periodo.mes)?.label;
      
      pdf.save(`relatorio-${loja.nome}-${mesNome}-${reportData.periodo.ano}.pdf`);
      toast.success("PDF gerado com sucesso!");
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
  const previewInsights = reportData ? calculateInsights(reportData) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório Analítico
          </DialogTitle>
          <DialogDescription>
            {loja.nome} - {loja.cnpj.cliente.nome}
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
                disabled={!canGenerateReport || isGenerating || isLoadingDados}
                className="flex-1"
              >
                {isGenerating ? "Gerando..." : "Gerar Relatório"}
              </Button>
            </div>
          </div>

          {/* Preview do Relatório */}
          <div className="space-y-4">
            {previewInsights && reportData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview do Relatório</CardTitle>
                    <CardDescription>
                      {MESES.find(m => m.value === reportData.periodo.mes)?.label} {reportData.periodo.ano}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Vendas</p>
                          <p className="font-semibold">{formatCurrency(previewInsights.totalVendas)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Itens</p>
                          <p className="font-semibold">{previewInsights.totalItens}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">ROAS</p>
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

                    {previewInsights.crescimentoVendas !== undefined && (
                      <div className="mt-4">
                        <Separator className="mb-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Crescimento em Vendas:</span>
                          <Badge variant={previewInsights.crescimentoVendas > 0 ? "default" : "destructive"}>
                            {formatPercentage(previewInsights.crescimentoVendas)}
                          </Badge>
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
                    <p className="text-sm">para visualizar o preview</p>
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